import type { StepExecutor, ExecutionResult } from './execution-engine'
import type { ExecutionContext } from '~/types/database'

/**
 * Human task executor for steps requiring user interaction
 */
export class HumanTaskExecutor implements StepExecutor {
  type = 'human_task'

  async execute(input: any, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    // Human tasks are created and wait for user action
    return {
      success: true,
      output: {
        status: 'waiting_for_user',
        task_id: `task_${Date.now()}`,
        assigned_to: config.assignee,
        task_type: config.taskType || 'review',
        deadline: config.deadline,
        data: input,
        created_at: new Date().toISOString()
      }
    }
  }
}

/**
 * Data transformation executor
 */
export class DataTransformExecutor implements StepExecutor {
  type = 'transform'

  async execute(input: any, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      let result = { ...input }

      // Apply transformations based on config
      if (config.mappings) {
        for (const mapping of config.mappings) {
          const sourceValue = this.getNestedValue(input, mapping.source)
          this.setNestedValue(result, mapping.target, sourceValue)
        }
      }

      if (config.calculations) {
        for (const calc of config.calculations) {
          const value = this.performCalculation(calc, input)
          this.setNestedValue(result, calc.target, value)
        }
      }

      if (config.filters) {
        result = this.applyFilters(result, config.filters)
      }

      return {
        success: true,
        output: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transformation failed'
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {}
      return current[key]
    }, obj)
    target[lastKey] = value
  }

  private performCalculation(calc: any, data: any): any {
    const { operation, operands, target } = calc

    const values = operands.map((operand: any) => {
      if (typeof operand === 'string' && operand.startsWith('$')) {
        return this.getNestedValue(data, operand.slice(1))
      }
      return operand
    })

    switch (operation) {
      case 'add':
        return values.reduce((sum, val) => sum + Number(val), 0)
      case 'subtract':
        return values.reduce((diff, val, index) => index === 0 ? Number(val) : diff - Number(val))
      case 'multiply':
        return values.reduce((product, val) => product * Number(val), 1)
      case 'divide':
        return values.reduce((quotient, val, index) => index === 0 ? Number(val) : quotient / Number(val))
      case 'concat':
        return values.join('')
      case 'format_currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(values[0]))
      case 'format_date':
        return new Date(values[0]).toLocaleDateString()
      default:
        return values[0]
    }
  }

  private applyFilters(data: any, filters: any[]): any {
    let result = data

    for (const filter of filters) {
      switch (filter.type) {
        case 'remove_fields':
          filter.fields.forEach((field: string) => {
            delete result[field]
          })
          break
        case 'keep_fields':
          const newResult: any = {}
          filter.fields.forEach((field: string) => {
            if (field in result) {
              newResult[field] = result[field]
            }
          })
          result = newResult
          break
        case 'rename_fields':
          filter.mappings.forEach((mapping: { from: string; to: string }) => {
            if (mapping.from in result) {
              result[mapping.to] = result[mapping.from]
              delete result[mapping.from]
            }
          })
          break
      }
    }

    return result
  }
}

/**
 * Notification executor
 */
export class NotificationExecutor implements StepExecutor {
  type = 'notification'

  async execute(input: any, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      const notifications = []

      for (const channel of config.channels || []) {
        const notification = await this.sendNotification(channel, input, config)
        notifications.push(notification)
      }

      return {
        success: true,
        output: {
          notifications,
          sent_at: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notification failed'
      }
    }
  }

  private async sendNotification(channel: any, data: any, config: any): Promise<any> {
    const message = this.formatMessage(config.template, data)

    switch (channel.type) {
      case 'email':
        return this.sendEmail(channel.recipients, message, config.subject)
      case 'slack':
        return this.sendSlack(channel.webhook, message)
      case 'webhook':
        return this.sendWebhook(channel.url, { message, data })
      default:
        throw new Error(`Unsupported notification channel: ${channel.type}`)
    }
  }

  private formatMessage(template: string, data: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], data)
      return value?.toString() || match
    })
  }

  private async sendEmail(recipients: string[], message: string, subject: string): Promise<any> {
    // TODO: Integrate with email service (SendGrid, etc.)
    console.log('Sending email:', { recipients, subject, message })
    return {
      type: 'email',
      status: 'sent',
      recipients,
      message_id: `email_${Date.now()}`
    }
  }

  private async sendSlack(webhook: string, message: string): Promise<any> {
    // TODO: Integrate with Slack webhook
    console.log('Sending Slack message:', { webhook, message })
    return {
      type: 'slack',
      status: 'sent',
      webhook,
      message_id: `slack_${Date.now()}`
    }
  }

  private async sendWebhook(url: string, payload: any): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      return {
        type: 'webhook',
        status: response.ok ? 'sent' : 'failed',
        url,
        response_status: response.status,
        message_id: `webhook_${Date.now()}`
      }
    } catch (error) {
      return {
        type: 'webhook',
        status: 'failed',
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Parallel execution executor
 */
export class ParallelExecutor implements StepExecutor {
  type = 'parallel'

  async execute(input: any, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      const { branches } = config
      const results: any[] = []

      // Execute all branches in parallel
      const promises = branches.map(async (branch: any, index: number) => {
        try {
          // Each branch gets a copy of the input data
          const branchInput = JSON.parse(JSON.stringify(input))
          
          // TODO: Execute branch steps (this would need the execution engine)
          // For now, just return the input with branch metadata
          return {
            branch_id: branch.id || `branch_${index}`,
            status: 'completed',
            output: branchInput,
            completed_at: new Date().toISOString()
          }
        } catch (error) {
          return {
            branch_id: branch.id || `branch_${index}`,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Branch execution failed'
          }
        }
      })

      const branchResults = await Promise.allSettled(promises)
      
      // Collect results
      branchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            branch_id: `branch_${index}`,
            status: 'failed',
            error: result.reason
          })
        }
      })

      // Determine overall success
      const allSuccessful = results.every(r => r.status === 'completed')
      const anySuccessful = results.some(r => r.status === 'completed')

      // Based on config, we might require all branches to succeed or just one
      const requireAll = config.wait_for === 'all'
      const success = requireAll ? allSuccessful : anySuccessful

      return {
        success,
        output: {
          parallel_results: results,
          successful_branches: results.filter(r => r.status === 'completed').length,
          failed_branches: results.filter(r => r.status === 'failed').length,
          completed_at: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parallel execution failed'
      }
    }
  }
}

/**
 * Delay/Timer executor
 */
export class DelayExecutor implements StepExecutor {
  type = 'delay'

  async execute(input: any, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      const { duration, unit = 'minutes' } = config
      
      let delayMs: number
      switch (unit) {
        case 'seconds':
          delayMs = duration * 1000
          break
        case 'minutes':
          delayMs = duration * 60 * 1000
          break
        case 'hours':
          delayMs = duration * 60 * 60 * 1000
          break
        case 'days':
          delayMs = duration * 24 * 60 * 60 * 1000
          break
        default:
          delayMs = duration * 60 * 1000 // Default to minutes
      }

      // For production, this should be handled by a job queue
      // For now, we'll use setTimeout (not recommended for long delays)
      if (delayMs > 5 * 60 * 1000) { // More than 5 minutes
        // Schedule for later execution
        return {
          success: true,
          output: {
            status: 'scheduled',
            delay_until: new Date(Date.now() + delayMs).toISOString(),
            data: input
          }
        }
      } else {
        // Short delay - execute immediately
        await new Promise(resolve => setTimeout(resolve, delayMs))
        
        return {
          success: true,
          output: {
            status: 'completed',
            delayed_for: `${duration} ${unit}`,
            data: input,
            completed_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delay execution failed'
      }
    }
  }
}

/**
 * Conditional router executor
 */
export class ConditionalExecutor implements StepExecutor {
  type = 'conditional'

  async execute(input: any, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      const { conditions, default_path } = config
      
      for (const condition of conditions) {
        if (this.evaluateCondition(condition.rule, input)) {
          return {
            success: true,
            output: {
              condition_met: condition.name,
              next_path: condition.path,
              data: input
            },
            nextSteps: condition.next_steps || []
          }
        }
      }

      // No conditions met, use default path
      return {
        success: true,
        output: {
          condition_met: 'default',
          next_path: default_path,
          data: input
        },
        nextSteps: config.default_next_steps || []
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conditional evaluation failed'
      }
    }
  }

  private evaluateCondition(rule: any, data: any): boolean {
    const { field, operator, value } = rule
    const fieldValue = this.getNestedValue(data, field)

    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'greater_than':
        return Number(fieldValue) > Number(value)
      case 'less_than':
        return Number(fieldValue) < Number(value)
      case 'greater_equal':
        return Number(fieldValue) >= Number(value)
      case 'less_equal':
        return Number(fieldValue) <= Number(value)
      case 'contains':
        return String(fieldValue).includes(String(value))
      case 'starts_with':
        return String(fieldValue).startsWith(String(value))
      case 'ends_with':
        return String(fieldValue).endsWith(String(value))
      case 'is_empty':
        return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0)
      case 'is_not_empty':
        return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0)
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue)
      default:
        return false
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}

// Export all executors for easy registration
export const defaultStepExecutors = [
  new HumanTaskExecutor(),
  new DataTransformExecutor(),
  new NotificationExecutor(),
  new ParallelExecutor(),
  new DelayExecutor(),
  new ConditionalExecutor()
]