import { supabase } from '~/lib/supabase'
import type { 
  Workflow, 
  WorkflowExecution, 
  StepExecution, 
  WorkflowStep, 
  ExecutionContext,
  StepAction 
} from '~/types/database'

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

export interface ExecutionResult {
  success: boolean
  output?: any
  error?: string
  nextSteps?: string[]
}

export interface StepExecutor {
  type: string
  execute(input: any, config: any, context: ExecutionContext): Promise<ExecutionResult>
}

/**
 * Main workflow execution engine
 */
export class WorkflowExecutionEngine {
  private stepExecutors: Map<string, StepExecutor> = new Map()
  private runningExecutions: Map<string, WorkflowExecution> = new Map()

  constructor() {
    this.registerDefaultExecutors()
  }

  /**
   * Start workflow execution
   */
  async startExecution(
    workflowId: string,
    initiator: { type: 'user' | 'api' | 'trigger' | 'schedule'; id: string; metadata?: any },
    inputData: Record<string, any> = {},
    files: any[] = []
  ): Promise<{ executionId: string; error?: string }> {
    try {
      // Get workflow definition
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (workflowError || !workflow) {
        throw new Error(`Workflow not found: ${workflowError?.message}`)
      }

      if (workflow.status !== 'published') {
        throw new Error('Can only execute published workflows')
      }

      // Create execution record
      const executionData = {
        workflow_id: workflowId,
        workflow_version: workflow.version,
        organization_id: workflow.organization_id,
        status: 'running' as const,
        current_steps: this.getInitialSteps(workflow.config.steps),
        context: {
          initiator,
          data: inputData,
          files: files || []
        },
        started_at: new Date().toISOString(),
        sla_deadline: this.calculateSLADeadline(workflow.config.settings?.slaMinutes)
      }

      const { data: execution, error: executionError } = await supabase
        .from('workflow_executions')
        .insert(executionData)
        .select()
        .single()

      if (executionError) {
        throw new Error(`Failed to create execution: ${executionError.message}`)
      }

      // Store in memory for active tracking
      this.runningExecutions.set(execution.id, execution)

      // Start processing initial steps
      await this.processSteps(execution.id, workflow)

      return { executionId: execution.id }

    } catch (error) {
      console.error('Execution start failed:', error)
      return { 
        executionId: '', 
        error: error instanceof Error ? error.message : 'Failed to start execution' 
      }
    }
  }

  /**
   * Process workflow steps
   */
  private async processSteps(executionId: string, workflow: Workflow): Promise<void> {
    try {
      const execution = this.runningExecutions.get(executionId)
      if (!execution) throw new Error('Execution not found')

      const currentSteps = execution.current_steps || []
      const steps = workflow.config.steps

      // Process each current step
      for (const stepId of currentSteps) {
        const step = steps.find(s => s.id === stepId)
        if (!step) continue

        await this.executeStep(executionId, step, execution.context)
      }

    } catch (error) {
      console.error('Step processing failed:', error)
      await this.handleExecutionError(executionId, error)
    }
  }

  /**
   * Execute individual workflow step
   */
  private async executeStep(
    executionId: string,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<void> {
    try {
      // Create step execution record
      const stepExecution = await this.createStepExecution(executionId, step)

      // Get step executor
      const executor = this.stepExecutors.get(step.type)
      if (!executor) {
        throw new Error(`No executor found for step type: ${step.type}`)
      }

      // Mark step as in progress
      await this.updateStepStatus(stepExecution.id, 'in_progress')

      // Execute the step
      const result = await executor.execute(
        context.data,
        step.config,
        context
      )

      if (result.success) {
        // Update step execution with result
        await this.completeStepExecution(stepExecution.id, result.output)

        // Update execution context with step output
        await this.updateExecutionContext(executionId, {
          [`step_${step.id}`]: result.output
        })

        // Determine next steps
        const nextSteps = this.determineNextSteps(step, result.output)
        if (nextSteps.length > 0) {
          await this.updateCurrentSteps(executionId, nextSteps)
          // Continue processing
          const execution = this.runningExecutions.get(executionId)
          if (execution) {
            const workflow = await this.getWorkflow(execution.workflow_id)
            if (workflow) {
              await this.processSteps(executionId, workflow)
            }
          }
        } else {
          // Workflow completed
          await this.completeExecution(executionId)
        }

      } else {
        // Step failed
        await this.failStepExecution(stepExecution.id, result.error || 'Step execution failed')
        
        // Handle error based on workflow settings
        const execution = this.runningExecutions.get(executionId)
        const workflow = execution ? await this.getWorkflow(execution.workflow_id) : null
        const errorHandling = workflow?.config.settings?.errorHandling || 'stop'

        if (errorHandling === 'stop') {
          await this.failExecution(executionId, result.error)
        } else if (errorHandling === 'retry') {
          await this.retryStep(executionId, step, context)
        }
        // 'continue' would skip this step and continue
      }

    } catch (error) {
      console.error('Step execution failed:', error)
      await this.failStepExecution('', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Create step execution record
   */
  private async createStepExecution(
    executionId: string,
    step: WorkflowStep
  ): Promise<StepExecution> {
    const { data, error } = await supabase
      .from('step_executions')
      .insert({
        execution_id: executionId,
        step_id: step.id,
        step_name: step.name,
        status: 'pending',
        input: {},
        output: {},
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create step execution: ${error.message}`)
    }

    return data
  }

  /**
   * Update step execution status
   */
  private async updateStepStatus(stepExecutionId: string, status: StepStatus): Promise<void> {
    await supabase
      .from('step_executions')
      .update({ status })
      .eq('id', stepExecutionId)
  }

  /**
   * Complete step execution with output
   */
  private async completeStepExecution(stepExecutionId: string, output: any): Promise<void> {
    await supabase
      .from('step_executions')
      .update({
        status: 'completed',
        output,
        completed_at: new Date().toISOString(),
        duration: 0 // TODO: Calculate actual duration
      })
      .eq('id', stepExecutionId)
  }

  /**
   * Fail step execution with error
   */
  private async failStepExecution(stepExecutionId: string, error: string): Promise<void> {
    await supabase
      .from('step_executions')
      .update({
        status: 'failed',
        output: { error },
        completed_at: new Date().toISOString()
      })
      .eq('id', stepExecutionId)
  }

  /**
   * Determine next steps based on current step and output
   */
  private determineNextSteps(step: WorkflowStep, output: any): string[] {
    const nextSteps: string[] = []

    for (const connection of step.nextSteps || []) {
      if (this.evaluateCondition(connection.condition, output)) {
        nextSteps.push(connection.stepId)
      }
    }

    return nextSteps
  }

  /**
   * Evaluate step condition
   */
  private evaluateCondition(condition: any, data: any): boolean {
    if (!condition) return true

    const { field, operator, value } = condition

    const fieldValue = this.getNestedValue(data, field)

    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'greater':
        return Number(fieldValue) > Number(value)
      case 'less':
        return Number(fieldValue) < Number(value)
      case 'contains':
        return String(fieldValue).includes(String(value))
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      default:
        return true
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Register default step executors
   */
  private registerDefaultExecutors(): void {
    // Capture step executor
    this.stepExecutors.set('capture', {
      type: 'capture',
      async execute(input: any, config: any, context: ExecutionContext) {
        // For capture steps, just return the input data
        return {
          success: true,
          output: {
            captured_data: config.fields || {},
            timestamp: new Date().toISOString()
          }
        }
      }
    })

    // Review step executor
    this.stepExecutors.set('review', {
      type: 'review',
      async execute(input: any, config: any, context: ExecutionContext) {
        // Review steps require human action - mark as waiting
        return {
          success: true,
          output: {
            status: 'waiting_for_review',
            reviewer: config.reviewer,
            data: input
          }
        }
      }
    })

    // Approve step executor
    this.stepExecutors.set('approve', {
      type: 'approve',
      async execute(input: any, config: any, context: ExecutionContext) {
        // Approval steps require human action
        return {
          success: true,
          output: {
            status: 'waiting_for_approval',
            approver: config.approver,
            data: input
          }
        }
      }
    })

    // Update step executor
    this.stepExecutors.set('update', {
      type: 'update',
      async execute(input: any, config: any, context: ExecutionContext) {
        // Update steps modify data
        const updatedData = { ...input, ...config.updates }
        return {
          success: true,
          output: updatedData
        }
      }
    })

    // Condition step executor
    this.stepExecutors.set('condition', {
      type: 'condition',
      async execute(input: any, config: any, context: ExecutionContext) {
        // Condition steps evaluate logic
        const result = this.evaluateCondition(config.condition, input)
        return {
          success: true,
          output: {
            condition_result: result,
            data: input
          }
        }
      }
    })
  }

  /**
   * Helper methods
   */
  private getInitialSteps(steps: WorkflowStep[]): string[] {
    // Find steps with no dependencies (entry points)
    const stepIds = steps.map(s => s.id)
    const referencedSteps = new Set(
      steps.flatMap(s => s.nextSteps?.map(ns => ns.stepId) || [])
    )
    
    return stepIds.filter(id => !referencedSteps.has(id))
  }

  private calculateSLADeadline(slaMinutes?: number): string | null {
    if (!slaMinutes) return null
    
    const deadline = new Date()
    deadline.setMinutes(deadline.getMinutes() + slaMinutes)
    return deadline.toISOString()
  }

  private async updateCurrentSteps(executionId: string, stepIds: string[]): Promise<void> {
    await supabase
      .from('workflow_executions')
      .update({ current_steps: stepIds })
      .eq('id', executionId)
  }

  private async updateExecutionContext(executionId: string, updates: Record<string, any>): Promise<void> {
    const { data: execution } = await supabase
      .from('workflow_executions')
      .select('context')
      .eq('id', executionId)
      .single()

    if (execution) {
      const updatedContext = {
        ...execution.context,
        data: { ...execution.context.data, ...updates }
      }

      await supabase
        .from('workflow_executions')
        .update({ context: updatedContext })
        .eq('id', executionId)
    }
  }

  private async completeExecution(executionId: string): Promise<void> {
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        current_steps: []
      })
      .eq('id', executionId)

    this.runningExecutions.delete(executionId)
  }

  private async failExecution(executionId: string, error?: string): Promise<void> {
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        current_steps: []
      })
      .eq('id', executionId)

    this.runningExecutions.delete(executionId)
  }

  private async handleExecutionError(executionId: string, error: any): Promise<void> {
    console.error('Execution error:', error)
    await this.failExecution(executionId, error instanceof Error ? error.message : 'Unknown error')
  }

  private async retryStep(executionId: string, step: WorkflowStep, context: ExecutionContext): Promise<void> {
    // TODO: Implement retry logic with backoff
    console.log('Retrying step:', step.id)
  }

  private async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const { data } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    return data
  }

  /**
   * Public API methods
   */

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string): Promise<void> {
    const execution = this.runningExecutions.get(executionId)
    if (!execution) {
      throw new Error('Execution not found or not running')
    }

    // Update execution status
    await supabase
      .from('workflow_executions')
      .update({ 
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId)

    // Mark currently running steps as paused
    await supabase
      .from('step_executions')
      .update({ 
        status: 'pending', // Will be resumed when execution resumes
        output: { paused_at: new Date().toISOString() }
      })
      .eq('execution_id', executionId)
      .eq('status', 'in_progress')

    // Remove from active tracking
    this.runningExecutions.delete(executionId)

    console.log(`Execution ${executionId} paused`)
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string): Promise<void> {
    const { data: execution, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (error || !execution) {
      throw new Error('Execution not found')
    }

    if (execution.status !== 'paused') {
      throw new Error('Execution is not paused')
    }

    // Update execution status
    await supabase
      .from('workflow_executions')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId)

    // Resume paused steps
    await supabase
      .from('step_executions')
      .update({ 
        status: 'pending',
        output: { resumed_at: new Date().toISOString() }
      })
      .eq('execution_id', executionId)
      .in('status', ['pending']) // Only resume steps that were waiting

    // Add back to active tracking
    this.runningExecutions.set(executionId, execution)

    // Continue processing from where it left off
    const workflow = await this.getWorkflow(execution.workflow_id)
    if (workflow) {
      await this.processSteps(executionId, workflow)
    }

    console.log(`Execution ${executionId} resumed`)
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    await supabase
      .from('workflow_executions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)

    this.runningExecutions.delete(executionId)
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    const { data } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    return data
  }

  /**
   * Register custom step executor
   */
  registerStepExecutor(executor: StepExecutor): void {
    this.stepExecutors.set(executor.type, executor)
  }
}

// Global execution engine instance
export const executionEngine = new WorkflowExecutionEngine()