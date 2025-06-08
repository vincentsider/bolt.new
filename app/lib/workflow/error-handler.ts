import { supabase } from '~/lib/supabase'
import type { WorkflowExecution, StepExecution } from '~/types/database'

export type ErrorType = 'timeout' | 'validation' | 'external_api' | 'system' | 'user' | 'business_rule'
export type RetryStrategy = 'exponential' | 'linear' | 'fixed' | 'none'

export interface WorkflowError {
  id: string
  type: ErrorType
  message: string
  details?: any
  recoverable: boolean
  retryable: boolean
  timestamp: string
  context?: {
    stepId?: string
    executionId?: string
    userId?: string
  }
}

export interface RetryConfig {
  strategy: RetryStrategy
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: ErrorType[]
}

export interface ErrorHandlingConfig {
  onStepFailure: 'stop' | 'continue' | 'retry' | 'fallback'
  onWorkflowFailure: 'stop' | 'rollback' | 'notify'
  retryConfig: RetryConfig
  notifications: {
    channels: ('email' | 'slack' | 'webhook')[]
    recipients: string[]
    onErrors: ErrorType[]
  }
  fallbackSteps?: string[]
}

export class WorkflowErrorHandler {
  private defaultConfig: ErrorHandlingConfig = {
    onStepFailure: 'stop',
    onWorkflowFailure: 'stop',
    retryConfig: {
      strategy: 'exponential',
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['timeout', 'external_api', 'system']
    },
    notifications: {
      channels: ['email'],
      recipients: [],
      onErrors: ['system', 'timeout']
    }
  }

  /**
   * Handle step execution error
   */
  async handleStepError(
    error: any,
    stepExecutionId: string,
    executionId: string,
    config?: Partial<ErrorHandlingConfig>
  ): Promise<{ action: 'retry' | 'continue' | 'stop' | 'fallback'; delay?: number }> {
    
    const errorConfig = { ...this.defaultConfig, ...config }
    const workflowError = this.categorizeError(error, { stepExecutionId, executionId })
    
    // Log error
    await this.logError(workflowError)
    
    // Update step execution with error
    await this.updateStepExecutionError(stepExecutionId, workflowError)
    
    // Send notifications if configured
    if (errorConfig.notifications.onErrors.includes(workflowError.type)) {
      await this.sendErrorNotifications(workflowError, errorConfig.notifications)
    }
    
    // Determine action based on error type and config
    if (workflowError.retryable && errorConfig.onStepFailure === 'retry') {
      const retryAttempt = await this.getRetryAttempt(stepExecutionId)
      
      if (retryAttempt < errorConfig.retryConfig.maxAttempts) {
        const delay = this.calculateRetryDelay(retryAttempt, errorConfig.retryConfig)
        await this.scheduleRetry(stepExecutionId, retryAttempt + 1, delay)
        
        return { action: 'retry', delay }
      }
    }
    
    // Handle based on configuration
    switch (errorConfig.onStepFailure) {
      case 'continue':
        return { action: 'continue' }
      case 'fallback':
        if (errorConfig.fallbackSteps?.length) {
          return { action: 'fallback' }
        }
        return { action: 'stop' }
      default:
        return { action: 'stop' }
    }
  }

  /**
   * Handle workflow execution error
   */
  async handleWorkflowError(
    error: any,
    executionId: string,
    config?: Partial<ErrorHandlingConfig>
  ): Promise<void> {
    
    const errorConfig = { ...this.defaultConfig, ...config }
    const workflowError = this.categorizeError(error, { executionId })
    
    await this.logError(workflowError)
    
    // Update execution status
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)
    
    // Handle based on configuration
    switch (errorConfig.onWorkflowFailure) {
      case 'rollback':
        await this.rollbackWorkflow(executionId)
        break
      case 'notify':
        await this.sendErrorNotifications(workflowError, errorConfig.notifications)
        break
    }
    
    // Always send critical error notifications
    if (workflowError.type === 'system') {
      await this.sendCriticalErrorAlert(workflowError, executionId)
    }
  }

  /**
   * Categorize and enrich error information
   */
  private categorizeError(error: any, context: { stepExecutionId?: string; executionId?: string; userId?: string }): WorkflowError {
    const baseError: WorkflowError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      message: error instanceof Error ? error.message : String(error),
      details: error,
      recoverable: false,
      retryable: false,
      timestamp: new Date().toISOString(),
      context
    }

    // Categorize by error patterns
    const errorMessage = baseError.message.toLowerCase()
    
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        ...baseError,
        type: 'timeout',
        recoverable: true,
        retryable: true
      }
    }
    
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        ...baseError,
        type: 'validation',
        recoverable: true,
        retryable: false
      }
    }
    
    if (errorMessage.includes('api') || errorMessage.includes('request failed') || errorMessage.includes('network')) {
      return {
        ...baseError,
        type: 'external_api',
        recoverable: true,
        retryable: true
      }
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return {
        ...baseError,
        type: 'user',
        recoverable: true,
        retryable: false
      }
    }
    
    if (errorMessage.includes('business') || errorMessage.includes('rule') || errorMessage.includes('policy')) {
      return {
        ...baseError,
        type: 'business_rule',
        recoverable: true,
        retryable: false
      }
    }
    
    // Default to system error
    return {
      ...baseError,
      type: 'system',
      recoverable: false,
      retryable: true
    }
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay: number
    
    switch (config.strategy) {
      case 'exponential':
        delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        )
        break
      case 'linear':
        delay = Math.min(
          config.baseDelayMs * (attempt + 1),
          config.maxDelayMs
        )
        break
      case 'fixed':
        delay = config.baseDelayMs
        break
      default:
        delay = config.baseDelayMs
    }
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay
    return Math.floor(delay + jitter)
  }

  /**
   * Get current retry attempt for a step execution
   */
  private async getRetryAttempt(stepExecutionId: string): Promise<number> {
    const { data } = await supabase
      .from('step_executions')
      .select('output')
      .eq('id', stepExecutionId)
      .single()
    
    return data?.output?.retry_attempt || 0
  }

  /**
   * Schedule retry for step execution
   */
  private async scheduleRetry(stepExecutionId: string, attempt: number, delayMs: number): Promise<void> {
    const retryAt = new Date(Date.now() + delayMs).toISOString()
    
    await supabase
      .from('step_executions')
      .update({
        status: 'pending',
        output: {
          retry_attempt: attempt,
          retry_scheduled_at: retryAt,
          retry_delay_ms: delayMs
        }
      })
      .eq('id', stepExecutionId)
    
    // TODO: Schedule actual retry execution (use job queue in production)
    console.log(`Retry scheduled for step ${stepExecutionId} in ${delayMs}ms (attempt ${attempt})`)
  }

  /**
   * Update step execution with error details
   */
  private async updateStepExecutionError(stepExecutionId: string, error: WorkflowError): Promise<void> {
    await supabase
      .from('step_executions')
      .update({
        status: 'failed',
        output: {
          error: {
            id: error.id,
            type: error.type,
            message: error.message,
            recoverable: error.recoverable,
            retryable: error.retryable,
            timestamp: error.timestamp
          }
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', stepExecutionId)
  }

  /**
   * Log error to audit system
   */
  private async logError(error: WorkflowError): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: error.context?.executionId, // Will need to resolve from execution
          action: 'workflow_error',
          resource: 'workflow_execution',
          resource_id: error.context?.executionId,
          metadata: {
            error_id: error.id,
            error_type: error.type,
            error_message: error.message,
            recoverable: error.recoverable,
            retryable: error.retryable,
            step_id: error.context?.stepId,
            details: error.details
          },
          timestamp: error.timestamp
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  /**
   * Send error notifications
   */
  private async sendErrorNotifications(
    error: WorkflowError,
    config: ErrorHandlingConfig['notifications']
  ): Promise<void> {
    
    const message = this.formatErrorMessage(error)
    
    for (const channel of config.channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(config.recipients, error, message)
            break
          case 'slack':
            await this.sendSlackNotification(error, message)
            break
          case 'webhook':
            await this.sendWebhookNotification(error, message)
            break
        }
      } catch (notificationError) {
        console.error(`Failed to send ${channel} notification:`, notificationError)
      }
    }
  }

  /**
   * Send critical error alert
   */
  private async sendCriticalErrorAlert(error: WorkflowError, executionId: string): Promise<void> {
    // TODO: Implement critical alert system (PagerDuty, etc.)
    console.error('CRITICAL WORKFLOW ERROR:', {
      errorId: error.id,
      executionId,
      type: error.type,
      message: error.message,
      timestamp: error.timestamp
    })
  }

  /**
   * Rollback workflow execution
   */
  private async rollbackWorkflow(executionId: string): Promise<void> {
    try {
      // Get all completed step executions for this workflow
      const { data: stepExecutions } = await supabase
        .from('step_executions')
        .select('*')
        .eq('execution_id', executionId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
      
      // Execute rollback steps in reverse order
      for (const stepExecution of stepExecutions || []) {
        await this.rollbackStep(stepExecution)
      }
      
      // Mark execution as rolled back
      await supabase
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId)
        
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError)
      
      // Mark as failed rollback
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId)
    }
  }

  /**
   * Rollback individual step
   */
  private async rollbackStep(stepExecution: StepExecution): Promise<void> {
    // TODO: Implement step-specific rollback logic
    // This would depend on the step type and what actions it performed
    console.log(`Rolling back step: ${stepExecution.step_name}`)
    
    // Create rollback record
    await supabase
      .from('step_executions')
      .insert({
        execution_id: stepExecution.execution_id,
        step_id: `rollback_${stepExecution.step_id}`,
        step_name: `Rollback: ${stepExecution.step_name}`,
        status: 'completed',
        input: stepExecution.output,
        output: { rollback_of: stepExecution.id },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
  }

  /**
   * Format error message for notifications
   */
  private formatErrorMessage(error: WorkflowError): string {
    return `
🚨 Workflow Error Alert

Error ID: ${error.id}
Type: ${error.type.toUpperCase()}
Message: ${error.message}
Recoverable: ${error.recoverable ? 'Yes' : 'No'}
Retryable: ${error.retryable ? 'Yes' : 'No'}
Timestamp: ${error.timestamp}

Context:
- Execution ID: ${error.context?.executionId || 'N/A'}
- Step ID: ${error.context?.stepId || 'N/A'}
- User ID: ${error.context?.userId || 'N/A'}

Please investigate and take appropriate action.
    `.trim()
  }

  /**
   * Notification methods
   */
  private async sendEmailNotification(recipients: string[], error: WorkflowError, message: string): Promise<void> {
    // TODO: Integrate with email service
    console.log('Email notification:', { recipients, error: error.id, message })
  }

  private async sendSlackNotification(error: WorkflowError, message: string): Promise<void> {
    // TODO: Integrate with Slack webhook
    console.log('Slack notification:', { error: error.id, message })
  }

  private async sendWebhookNotification(error: WorkflowError, message: string): Promise<void> {
    // TODO: Send to configured webhook endpoints
    console.log('Webhook notification:', { error: error.id, message })
  }

  /**
   * Error recovery utilities
   */
  
  /**
   * Attempt automatic error recovery
   */
  async attemptRecovery(error: WorkflowError, executionId: string): Promise<boolean> {
    if (!error.recoverable) return false
    
    try {
      switch (error.type) {
        case 'timeout':
          // Increase timeout and retry
          return await this.recoverFromTimeout(executionId, error)
        case 'external_api':
          // Check API status and retry with different endpoint
          return await this.recoverFromApiError(executionId, error)
        case 'validation':
          // Apply data corrections and retry
          return await this.recoverFromValidationError(executionId, error)
        default:
          return false
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError)
      return false
    }
  }

  private async recoverFromTimeout(executionId: string, error: WorkflowError): Promise<boolean> {
    // TODO: Implement timeout recovery logic
    return false
  }

  private async recoverFromApiError(executionId: string, error: WorkflowError): Promise<boolean> {
    // TODO: Implement API error recovery logic
    return false
  }

  private async recoverFromValidationError(executionId: string, error: WorkflowError): Promise<boolean> {
    // TODO: Implement validation error recovery logic
    return false
  }
}

// Global error handler instance
export const workflowErrorHandler = new WorkflowErrorHandler()