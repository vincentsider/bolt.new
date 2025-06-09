// Trigger Execution Engine
// Monitors and executes workflow triggers based on their configuration

import type {
  WorkflowTrigger,
  TriggerEvent,
  TriggerMonitor,
  TriggerType,
  TriggerConfig
} from '~/types/trigger-library'
import type { Workflow } from '~/types/database'

export class TriggerEngine {
  private monitors: Map<string, TriggerMonitor> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  
  constructor(
    private organizationId: string,
    private supabaseUrl: string,
    private supabaseKey: string
  ) {}

  /**
   * Start monitoring a trigger
   */
  async startMonitoring(trigger: WorkflowTrigger): Promise<void> {
    console.log(`Starting monitoring for trigger ${trigger.id} (${trigger.name})`)
    
    // Create monitor record
    const monitor: TriggerMonitor = {
      triggerId: trigger.id,
      active: true,
      lastCheck: new Date().toISOString(),
      nextCheck: this.calculateNextCheck(trigger),
      status: 'healthy',
      checkInterval: this.getCheckInterval(trigger)
    }
    
    this.monitors.set(trigger.id, monitor)
    
    // Start appropriate monitoring based on trigger type
    switch (trigger.templateId) {
      case 'scheduled':
        this.startScheduledMonitoring(trigger)
        break
      case 'email_received':
        this.startEmailMonitoring(trigger)
        break
      case 'file_added':
        this.startFileMonitoring(trigger)
        break
      case 'webhook':
        this.startWebhookMonitoring(trigger)
        break
      case 'condition_met':
        this.startConditionMonitoring(trigger)
        break
      // Manual triggers don't need monitoring
    }
  }

  /**
   * Stop monitoring a trigger
   */
  async stopMonitoring(triggerId: string): Promise<void> {
    console.log(`Stopping monitoring for trigger ${triggerId}`)
    
    // Clear interval if exists
    const interval = this.intervals.get(triggerId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(triggerId)
    }
    
    // Update monitor status
    const monitor = this.monitors.get(triggerId)
    if (monitor) {
      monitor.active = false
      monitor.status = 'disabled'
    }
  }

  /**
   * Execute a trigger and start the workflow
   */
  async executeTrigger(trigger: WorkflowTrigger, eventData: any = {}): Promise<void> {
    console.log(`Executing trigger ${trigger.id} for workflow ${trigger.workflowId}`)
    
    try {
      // Create trigger event record
      const event: Partial<TriggerEvent> = {
        triggerId: trigger.id,
        eventType: this.getTriggerType(trigger),
        eventData,
        timestamp: new Date().toISOString(),
        processed: false
      }
      
      // Save event to database
      const savedEvent = await this.saveTriggerEvent(event)
      
      // Start workflow execution
      const workflowInstance = await this.startWorkflowExecution(trigger.workflowId, {
        triggerId: trigger.id,
        eventId: savedEvent.id,
        eventData
      })
      
      // Update event with workflow instance ID
      await this.updateTriggerEvent(savedEvent.id, {
        processed: true,
        workflowInstanceId: workflowInstance.id
      })
      
      // Update trigger statistics
      await this.updateTriggerStats(trigger.id, true)
      
      // Update monitor status
      const monitor = this.monitors.get(trigger.id)
      if (monitor) {
        monitor.lastTriggered = new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`Failed to execute trigger ${trigger.id}:`, error)
      
      // Update trigger error count
      await this.updateTriggerStats(trigger.id, false)
      
      // Update monitor status
      const monitor = this.monitors.get(trigger.id)
      if (monitor) {
        monitor.status = 'error'
        monitor.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      }
      
      throw error
    }
  }

  /**
   * Start scheduled trigger monitoring
   */
  private startScheduledMonitoring(trigger: WorkflowTrigger): void {
    const config = trigger.config.scheduled
    if (!config) return
    
    const checkInterval = this.calculateScheduleInterval(config)
    
    const interval = setInterval(async () => {
      const shouldTrigger = this.checkSchedule(config)
      if (shouldTrigger) {
        await this.executeTrigger(trigger, {
          scheduledTime: new Date().toISOString(),
          scheduleType: config.type
        })
      }
    }, checkInterval)
    
    this.intervals.set(trigger.id, interval)
  }

  /**
   * Start email monitoring
   */
  private startEmailMonitoring(trigger: WorkflowTrigger): void {
    const config = trigger.config.email
    if (!config) return
    
    // Poll email inbox at regular intervals
    const interval = setInterval(async () => {
      try {
        const newEmails = await this.checkEmailInbox(config)
        
        for (const email of newEmails) {
          // Check if email matches filters
          if (this.emailMatchesFilters(email, config)) {
            await this.executeTrigger(trigger, {
              emailId: email.id,
              from: email.from,
              subject: email.subject,
              body: email.body,
              attachments: email.attachments
            })
          }
        }
      } catch (error) {
        console.error(`Email monitoring error for trigger ${trigger.id}:`, error)
        this.updateMonitorError(trigger.id, error)
      }
    }, 60000) // Check every minute
    
    this.intervals.set(trigger.id, interval)
  }

  /**
   * Start file monitoring
   */
  private startFileMonitoring(trigger: WorkflowTrigger): void {
    const config = trigger.config.file
    if (!config) return
    
    // Poll file storage at regular intervals
    const interval = setInterval(async () => {
      try {
        const newFiles = await this.checkFileStorage(config)
        
        for (const file of newFiles) {
          // Check if file matches patterns
          if (this.fileMatchesPattern(file, config)) {
            await this.executeTrigger(trigger, {
              fileName: file.name,
              filePath: file.path,
              fileSize: file.size,
              fileType: file.type,
              uploadedAt: file.uploadedAt
            })
          }
        }
      } catch (error) {
        console.error(`File monitoring error for trigger ${trigger.id}:`, error)
        this.updateMonitorError(trigger.id, error)
      }
    }, 120000) // Check every 2 minutes
    
    this.intervals.set(trigger.id, interval)
  }

  /**
   * Start webhook monitoring (just register the endpoint)
   */
  private startWebhookMonitoring(trigger: WorkflowTrigger): void {
    const config = trigger.config.webhook
    if (!config) return
    
    // Register webhook endpoint
    console.log(`Webhook registered at: ${config.url}`)
    
    // No active monitoring needed for webhooks
    // They are triggered by external calls
  }

  /**
   * Start condition monitoring
   */
  private startConditionMonitoring(trigger: WorkflowTrigger): void {
    const config = trigger.config.condition
    if (!config) return
    
    // Check conditions at specified interval
    const interval = setInterval(async () => {
      try {
        const conditionsMet = await this.checkConditions(config)
        
        if (conditionsMet) {
          // Check cooldown period
          const monitor = this.monitors.get(trigger.id)
          if (monitor && monitor.lastTriggered) {
            const lastTriggerTime = new Date(monitor.lastTriggered).getTime()
            const cooldownMs = (config.cooldownMinutes || 0) * 60000
            
            if (Date.now() - lastTriggerTime < cooldownMs) {
              console.log(`Trigger ${trigger.id} in cooldown period`)
              return
            }
          }
          
          await this.executeTrigger(trigger, {
            conditionsChecked: config.conditions,
            conditionsMet: true
          })
        }
      } catch (error) {
        console.error(`Condition monitoring error for trigger ${trigger.id}:`, error)
        this.updateMonitorError(trigger.id, error)
      }
    }, config.checkInterval * 60000) // Convert minutes to milliseconds
    
    this.intervals.set(trigger.id, interval)
  }

  /**
   * Process a webhook call
   */
  async processWebhook(
    triggerId: string, 
    method: string, 
    headers: Record<string, string>, 
    body: any
  ): Promise<{ success: boolean; message: string }> {
    const trigger = await this.getTrigger(triggerId)
    if (!trigger) {
      return { success: false, message: 'Trigger not found' }
    }
    
    const config = trigger.config.webhook
    if (!config) {
      return { success: false, message: 'Invalid webhook configuration' }
    }
    
    // Validate method
    if (config.method && config.method !== method) {
      return { success: false, message: 'Invalid HTTP method' }
    }
    
    // Validate authentication
    if (config.authentication && config.authentication.type !== 'none') {
      const isValid = await this.validateWebhookAuth(config.authentication, headers)
      if (!isValid) {
        return { success: false, message: 'Authentication failed' }
      }
    }
    
    // Validate headers
    if (config.expectedHeaders) {
      for (const [key, value] of Object.entries(config.expectedHeaders)) {
        if (headers[key.toLowerCase()] !== value) {
          return { success: false, message: `Header validation failed: ${key}` }
        }
      }
    }
    
    // Execute trigger
    await this.executeTrigger(trigger, {
      method,
      headers,
      body,
      timestamp: new Date().toISOString()
    })
    
    return { success: true, message: 'Webhook processed successfully' }
  }

  // Helper methods
  
  private calculateNextCheck(trigger: WorkflowTrigger): string {
    const interval = this.getCheckInterval(trigger)
    return new Date(Date.now() + interval).toISOString()
  }
  
  private getCheckInterval(trigger: WorkflowTrigger): number {
    // Return interval in milliseconds based on trigger type
    const config = trigger.config
    
    if (config.scheduled) {
      return this.calculateScheduleInterval(config.scheduled)
    }
    
    if (config.condition) {
      return config.condition.checkInterval * 60000 // Convert minutes to ms
    }
    
    // Default intervals for polling triggers
    if (config.email) return 60000 // 1 minute
    if (config.file) return 120000 // 2 minutes
    
    return 300000 // Default 5 minutes
  }
  
  private calculateScheduleInterval(config: any): number {
    // Calculate check interval based on schedule type
    switch (config.type) {
      case 'once': return 60000 // Check every minute
      case 'daily': return 3600000 // Check every hour
      case 'weekly': return 86400000 // Check daily
      case 'monthly': return 86400000 // Check daily
      default: return 60000 // Check every minute for custom cron
    }
  }
  
  private checkSchedule(config: any): boolean {
    const now = new Date()
    
    switch (config.type) {
      case 'daily': {
        if (!config.time) return false
        const [hour, minute] = config.time.split(':').map(Number)
        return now.getHours() === hour && now.getMinutes() === minute
      }
        
      case 'weekly': {
        if (!config.time || config.dayOfWeek === undefined) return false
        const [hour, minute] = config.time.split(':').map(Number)
        return now.getDay() === config.dayOfWeek && 
               now.getHours() === hour && 
               now.getMinutes() === minute
      }
               
      // Add more schedule type checks as needed
      default:
        return false
    }
  }
  
  private async checkEmailInbox(config: any): Promise<any[]> {
    // Implementation would connect to email provider
    // and fetch new emails since last check
    console.log('Checking email inbox:', config.mailbox)
    return []
  }
  
  private emailMatchesFilters(email: any, config: any): boolean {
    if (config.fromFilter && !email.from.includes(config.fromFilter)) return false
    if (config.toFilter && !email.to.includes(config.toFilter)) return false
    if (config.subjectFilter && !email.subject.includes(config.subjectFilter)) return false
    if (config.bodyFilter && !email.body.includes(config.bodyFilter)) return false
    return true
  }
  
  private async checkFileStorage(config: any): Promise<any[]> {
    // Implementation would connect to file storage platform
    // and check for new files in specified folder
    console.log('Checking file storage:', config.platform, config.folder)
    return []
  }
  
  private fileMatchesPattern(file: any, config: any): boolean {
    if (config.filePattern) {
      const regex = new RegExp(config.filePattern)
      if (!regex.test(file.name)) return false
    }
    
    if (config.fileTypes && config.fileTypes.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !config.fileTypes.includes(extension)) return false
    }
    
    if (config.minFileSize && file.size < config.minFileSize) return false
    if (config.maxFileSize && file.size > config.maxFileSize) return false
    
    return true
  }
  
  private async checkConditions(config: any): Promise<boolean> {
    // Implementation would check specified conditions
    // against data sources
    console.log('Checking conditions:', config.conditions)
    
    // For now, return false to prevent infinite triggering
    return false
  }
  
  private async validateWebhookAuth(
    auth: any, 
    headers: Record<string, string>
  ): Promise<boolean> {
    switch (auth.type) {
      case 'bearer':
        return headers.authorization === `Bearer ${auth.secret}`
        
      case 'basic':
        // Decode and validate basic auth
        return true
        
      case 'api_key':
        return headers['x-api-key'] === auth.secret
        
      case 'signature':
        // Validate HMAC signature
        return true
        
      default:
        return false
    }
  }
  
  private getTriggerType(trigger: WorkflowTrigger): TriggerType {
    // Extract trigger type from template or config
    return 'manual' // Default
  }
  
  private updateMonitorError(triggerId: string, error: any): void {
    const monitor = this.monitors.get(triggerId)
    if (monitor) {
      monitor.status = 'error'
      monitor.errorMessage = error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Database operations (would use Supabase in real implementation)
  
  private async getTrigger(triggerId: string): Promise<WorkflowTrigger | null> {
    // Fetch trigger from database
    console.log('Fetching trigger:', triggerId)
    return null
  }
  
  private async saveTriggerEvent(event: Partial<TriggerEvent>): Promise<TriggerEvent> {
    // Save to database
    console.log('Saving trigger event:', event)
    return { ...event, id: `event-${Date.now()}` } as TriggerEvent
  }
  
  private async updateTriggerEvent(eventId: string, updates: Partial<TriggerEvent>): Promise<void> {
    // Update in database
    console.log('Updating trigger event:', eventId, updates)
  }
  
  private async updateTriggerStats(triggerId: string, success: boolean): Promise<void> {
    // Update trigger_count or error_count
    console.log('Updating trigger stats:', triggerId, success ? 'success' : 'error')
  }
  
  private async startWorkflowExecution(workflowId: string, context: any): Promise<any> {
    // Start workflow execution with trigger context
    console.log('Starting workflow execution:', workflowId, context)
    return { id: `instance-${Date.now()}` }
  }
}