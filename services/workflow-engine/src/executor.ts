import { Worker } from 'bullmq';
import pino from 'pino';
import { z } from 'zod';
import { WorkflowRepository } from './repository';
import { WorkflowQueue } from './queue';
import { EventBus } from './events';
import { StepExecutor } from './steps';
import { WorkflowContext, WorkflowExecution, WorkflowStep } from './types';

const logger = pino({ name: 'workflow-executor' });

export class WorkflowExecutor {
  private workers: Worker[] = [];
  private stepExecutor: StepExecutor;

  constructor(
    private repository: WorkflowRepository,
    private queue: WorkflowQueue,
    private eventBus: EventBus
  ) {
    this.stepExecutor = new StepExecutor(eventBus);
  }

  async start() {
    // Main workflow execution worker
    const mainWorker = new Worker(
      'workflow-execution',
      async (job) => {
        const { executionId, tenantId } = job.data;
        await this.executeWorkflow(executionId, tenantId);
      },
      {
        connection: this.queue.connection,
        concurrency: 10,
      }
    );

    // Step execution worker
    const stepWorker = new Worker(
      'step-execution',
      async (job) => {
        const { executionId, stepId, tenantId } = job.data;
        await this.executeStep(executionId, stepId, tenantId);
      },
      {
        connection: this.queue.connection,
        concurrency: 20,
      }
    );

    // Retry worker for failed steps
    const retryWorker = new Worker(
      'step-retry',
      async (job) => {
        const { executionId, stepId, tenantId, attempt } = job.data;
        await this.retryStep(executionId, stepId, tenantId, attempt);
      },
      {
        connection: this.queue.connection,
        concurrency: 5,
      }
    );

    this.workers.push(mainWorker, stepWorker, retryWorker);
    logger.info('Workflow executor started');
  }

  async stop() {
    await Promise.all(this.workers.map(w => w.close()));
    logger.info('Workflow executor stopped');
  }

  private async executeWorkflow(executionId: string, tenantId: string) {
    try {
      const execution = await this.repository.getExecution(executionId, tenantId);
      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      const workflow = await this.repository.getWorkflow(execution.workflowId, tenantId);
      if (!workflow) {
        throw new Error(`Workflow ${execution.workflowId} not found`);
      }

      logger.info({ executionId, workflowId: workflow.id }, 'Starting workflow execution');

      // Update execution status
      await this.repository.updateExecution(executionId, tenantId, {
        status: 'running',
        startedAt: new Date(),
      });

      // Emit start event
      await this.eventBus.emit('workflow.started', {
        executionId,
        workflowId: workflow.id,
        tenantId,
      });

      // Execute first steps (no dependencies)
      const firstSteps = workflow.steps.filter(step => !step.dependsOn || step.dependsOn.length === 0);
      
      for (const step of firstSteps) {
        await this.queue.addStepExecution({
          executionId,
          stepId: step.id,
          tenantId,
        });
      }

    } catch (error) {
      logger.error({ executionId, error }, 'Workflow execution failed');
      await this.handleWorkflowError(executionId, tenantId, error as Error);
    }
  }

  private async executeStep(executionId: string, stepId: string, tenantId: string) {
    try {
      const execution = await this.repository.getExecution(executionId, tenantId);
      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      const workflow = await this.repository.getWorkflow(execution.workflowId, tenantId);
      if (!workflow) {
        throw new Error(`Workflow ${execution.workflowId} not found`);
      }

      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }

      logger.info({ executionId, stepId }, 'Executing step');

      // Create step execution record
      await this.repository.createStepExecution({
        id: `${executionId}-${stepId}`,
        executionId,
        stepId,
        status: 'running',
        startedAt: new Date(),
        tenantId,
      });

      // Build context
      const context: WorkflowContext = {
        executionId,
        workflowId: workflow.id,
        tenantId,
        input: execution.input,
        variables: execution.variables || {},
        steps: execution.stepResults || {},
      };

      // Execute step
      const result = await this.stepExecutor.execute(step, context);

      // Update step execution
      await this.repository.updateStepExecution(`${executionId}-${stepId}`, tenantId, {
        status: 'completed',
        completedAt: new Date(),
        output: result,
      });

      // Update execution variables
      await this.repository.updateExecution(executionId, tenantId, {
        variables: { ...execution.variables, ...result.variables },
        stepResults: { ...execution.stepResults, [stepId]: result },
      });

      // Queue dependent steps
      const dependentSteps = workflow.steps.filter(s => 
        s.dependsOn?.includes(stepId) &&
        s.dependsOn.every(depId => execution.stepResults?.[depId]?.status === 'completed')
      );

      for (const depStep of dependentSteps) {
        await this.queue.addStepExecution({
          executionId,
          stepId: depStep.id,
          tenantId,
        });
      }

      // Check if workflow is complete
      const allStepsComplete = workflow.steps.every(s => 
        execution.stepResults?.[s.id]?.status === 'completed'
      );

      if (allStepsComplete) {
        await this.completeWorkflow(executionId, tenantId);
      }

    } catch (error) {
      logger.error({ executionId, stepId, error }, 'Step execution failed');
      await this.handleStepError(executionId, stepId, tenantId, error as Error);
    }
  }

  private async retryStep(executionId: string, stepId: string, tenantId: string, attempt: number) {
    logger.info({ executionId, stepId, attempt }, 'Retrying step');
    
    // Update retry count
    await this.repository.updateStepExecution(`${executionId}-${stepId}`, tenantId, {
      retryCount: attempt,
      lastRetryAt: new Date(),
    });

    // Re-execute step
    await this.executeStep(executionId, stepId, tenantId);
  }

  private async handleWorkflowError(executionId: string, tenantId: string, error: Error) {
    await this.repository.updateExecution(executionId, tenantId, {
      status: 'failed',
      completedAt: new Date(),
      error: {
        message: error.message,
        stack: error.stack,
      },
    });

    await this.eventBus.emit('workflow.failed', {
      executionId,
      tenantId,
      error: error.message,
    });
  }

  private async handleStepError(executionId: string, stepId: string, tenantId: string, error: Error) {
    const stepExecution = await this.repository.getStepExecution(`${executionId}-${stepId}`, tenantId);
    const retryCount = stepExecution?.retryCount || 0;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      // Schedule retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await this.queue.addStepRetry({
        executionId,
        stepId,
        tenantId,
        attempt: retryCount + 1,
      }, delay);
    } else {
      // Mark step as failed
      await this.repository.updateStepExecution(`${executionId}-${stepId}`, tenantId, {
        status: 'failed',
        completedAt: new Date(),
        error: {
          message: error.message,
          stack: error.stack,
        },
      });

      // Fail the workflow
      await this.handleWorkflowError(executionId, tenantId, new Error(`Step ${stepId} failed after ${maxRetries} retries`));
    }
  }

  private async completeWorkflow(executionId: string, tenantId: string) {
    await this.repository.updateExecution(executionId, tenantId, {
      status: 'completed',
      completedAt: new Date(),
    });

    await this.eventBus.emit('workflow.completed', {
      executionId,
      tenantId,
    });

    logger.info({ executionId }, 'Workflow completed successfully');
  }

  async pauseExecution(executionId: string, tenantId: string) {
    await this.repository.updateExecution(executionId, tenantId, {
      status: 'paused',
      pausedAt: new Date(),
    });

    // Remove any pending jobs
    await this.queue.removePendingJobs(executionId);

    await this.eventBus.emit('workflow.paused', {
      executionId,
      tenantId,
    });
  }

  async resumeExecution(executionId: string, tenantId: string) {
    const execution = await this.repository.getExecution(executionId, tenantId);
    if (!execution || execution.status !== 'paused') {
      throw new Error('Execution is not paused');
    }

    await this.repository.updateExecution(executionId, tenantId, {
      status: 'running',
      resumedAt: new Date(),
    });

    // Re-queue pending steps
    const workflow = await this.repository.getWorkflow(execution.workflowId, tenantId);
    if (!workflow) return;

    const pendingSteps = workflow.steps.filter(step => {
      const stepResult = execution.stepResults?.[step.id];
      return !stepResult || stepResult.status === 'pending';
    });

    for (const step of pendingSteps) {
      const dependenciesComplete = !step.dependsOn || step.dependsOn.every(depId => 
        execution.stepResults?.[depId]?.status === 'completed'
      );

      if (dependenciesComplete) {
        await this.queue.addStepExecution({
          executionId,
          stepId: step.id,
          tenantId,
        });
      }
    }

    await this.eventBus.emit('workflow.resumed', {
      executionId,
      tenantId,
    });
  }

  async cancelExecution(executionId: string, tenantId: string) {
    await this.repository.updateExecution(executionId, tenantId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    // Remove any pending jobs
    await this.queue.removePendingJobs(executionId);

    await this.eventBus.emit('workflow.cancelled', {
      executionId,
      tenantId,
    });
  }
}