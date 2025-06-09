// Trigger Library Type Definitions
// Based on PRD Trigger Library specification

export type TriggerType = 
  | 'manual'
  | 'scheduled'
  | 'email_received'
  | 'file_added'
  | 'record_created'
  | 'record_updated'
  | 'webhook'
  | 'condition_met'

export type TriggerCategory = 
  | 'user_initiated'
  | 'time_based'
  | 'event_based'
  | 'system_based'

export type ScheduleType = 
  | 'once'
  | 'daily'
  | 'weekly' 
  | 'monthly'
  | 'yearly'
  | 'custom_cron'

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'contains'
  | 'not_contains'
  | 'in_list'
  | 'not_in_list'
  | 'is_empty'
  | 'is_not_empty'

export interface AITriggerKeyword {
  keyword: string
  weight: number // 1-10, higher = more likely to match
  context?: string[] // Additional context words that strengthen the match
  triggerType: TriggerType
}

export interface TriggerTemplate {
  id: string
  name: string
  description: string
  type: TriggerType
  category: TriggerCategory
  
  // Admin configuration
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  
  // AI Understanding
  aiKeywords: AITriggerKeyword[]
  typicalUseCases: string[]
  
  // Configuration Schema
  configSchema: TriggerConfigSchema
  
  // UI Properties
  icon: string
  color: string
  
  // Setup Questions for AI
  setupQuestions: TriggerSetupQuestion[]
  
  // Integration Requirements
  requiredIntegrations?: string[]
  supportedSystems?: string[]
}

export interface TriggerConfigSchema {
  properties: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object'
      required: boolean
      description: string
      default?: any
      options?: string[] // For select fields
      validation?: {
        min?: number
        max?: number
        pattern?: string
      }
    }
  }
  required: string[]
}

export interface TriggerSetupQuestion {
  id: string
  question: string
  type: 'text' | 'select' | 'multi_select' | 'boolean' | 'number'
  required: boolean
  options?: string[]
  dependsOn?: string // Show only if another question has specific value
  dependsOnValue?: any
  helpText?: string
  configMapping: string // Which config property this question sets
}

// Trigger Instance (actual trigger configured for a workflow)
export interface WorkflowTrigger {
  id: string
  workflowId: string
  templateId: string // Reference to TriggerTemplate
  name: string
  description: string
  active: boolean
  
  // Trigger Configuration
  config: TriggerConfig
  
  // Data Mapping
  dataMapping: TriggerDataMapping
  
  // Monitoring
  lastTriggered?: string
  triggerCount: number
  errorCount: number
  
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface TriggerConfig {
  // Manual trigger config
  manual?: {
    allowedRoles: string[]
    confirmationRequired: boolean
    confirmationMessage?: string
  }
  
  // Scheduled trigger config
  scheduled?: {
    type: ScheduleType
    timezone: string
    
    // For specific schedule types
    time?: string // HH:MM format
    dayOfWeek?: number // 0-6 (Sunday=0)
    dayOfMonth?: number // 1-31
    month?: number // 1-12
    
    // For custom cron
    cronExpression?: string
    
    // Schedule constraints
    startDate?: string
    endDate?: string
    excludeHolidays?: boolean
    excludeWeekends?: boolean
  }
  
  // Email trigger config
  email?: {
    mailbox: string
    provider: 'exchange' | 'gmail' | 'imap' | 'outlook'
    
    // Filters
    fromFilter?: string
    toFilter?: string
    subjectFilter?: string
    bodyFilter?: string
    
    // Authentication
    authentication: {
      type: 'oauth' | 'password' | 'app_password'
      credentials?: Record<string, string>
    }
    
    // Processing
    markAsRead?: boolean
    moveToFolder?: string
    extractAttachments?: boolean
  }
  
  // File trigger config
  file?: {
    platform: 'sharepoint' | 'google_drive' | 'dropbox' | 'onedrive' | 'ftp'
    folder: string
    
    // File filters
    filePattern?: string // regex or glob pattern
    fileTypes?: string[] // ['pdf', 'docx', 'xlsx']
    minFileSize?: number // bytes
    maxFileSize?: number // bytes
    
    // Processing
    moveAfterProcessing?: boolean
    destinationFolder?: string
    deleteAfterProcessing?: boolean
  }
  
  // Record trigger config
  record?: {
    system: string // 'salesforce', 'hubspot', 'internal_api'
    entity: string // table/object name
    operation: 'created' | 'updated' | 'deleted'
    
    // Filters
    fieldFilters?: {
      field: string
      operator: ConditionOperator
      value: any
    }[]
    
    // API Configuration
    apiEndpoint?: string
    authentication?: {
      type: 'bearer' | 'basic' | 'api_key' | 'oauth'
      credentials: Record<string, string>
    }
    
    // Polling (if webhook not available)
    pollingInterval?: number // minutes
  }
  
  // Webhook trigger config
  webhook?: {
    url: string // The URL external systems will call
    method: 'POST' | 'GET' | 'PUT'
    
    // Security
    authentication?: {
      type: 'none' | 'bearer' | 'basic' | 'api_key' | 'signature'
      secret?: string
      allowedIPs?: string[]
    }
    
    // Request validation
    expectedHeaders?: Record<string, string>
    payloadValidation?: string // JSON schema
    
    // Response configuration
    responseBody?: string
    responseHeaders?: Record<string, string>
  }
  
  // Condition trigger config
  condition?: {
    checkInterval: number // minutes
    
    // Conditions to check
    conditions: {
      field: string // Can be from any connected system
      operator: ConditionOperator
      value: any
      source?: string // Which system to check
    }[]
    
    // Logic between conditions
    logic: 'AND' | 'OR'
    
    // Cooldown to prevent duplicate triggers
    cooldownMinutes?: number
  }
}

export interface TriggerDataMapping {
  // Maps trigger data to workflow step inputs
  mappings: {
    triggerField: string // Field from trigger data
    workflowField: string // Field in workflow (step.field format)
    transform?: string // Optional transformation function
    defaultValue?: any // Fallback if trigger field is empty
  }[]
  
  // Additional static data to inject
  staticData?: Record<string, any>
}

// AI Trigger Analysis
export interface TriggerSuggestion {
  userInput: string
  detectedIntent: string
  suggestedTriggers: {
    template: TriggerTemplate
    confidence: number // 0-1
    reasons: string[]
    suggestedConfig: Partial<TriggerConfig>
    setupQuestions: TriggerSetupQuestion[]
  }[]
  autoSelected?: TriggerTemplate
}

export interface TriggerConversation {
  workflowId: string
  currentTemplate?: TriggerTemplate
  answeredQuestions: Record<string, any>
  remainingQuestions: TriggerSetupQuestion[]
  generatedConfig?: TriggerConfig
  isComplete: boolean
}

// Trigger Execution
export interface TriggerEvent {
  id: string
  triggerId: string
  eventType: TriggerType
  eventData: Record<string, any>
  timestamp: string
  processed: boolean
  workflowInstanceId?: string
  error?: string
}

export interface TriggerMonitor {
  triggerId: string
  active: boolean
  lastCheck?: string
  nextCheck?: string
  status: 'healthy' | 'warning' | 'error' | 'disabled'
  errorMessage?: string
  checkInterval: number // minutes
}

// Database Models
export interface TriggerTemplateTable {
  id: string
  organization_id: string
  name: string
  description: string
  type: TriggerType
  category: TriggerCategory
  active: boolean
  ai_keywords: AITriggerKeyword[]
  typical_use_cases: string[]
  config_schema: TriggerConfigSchema
  icon: string
  color: string
  setup_questions: TriggerSetupQuestion[]
  required_integrations?: string[]
  supported_systems?: string[]
  created_at: string
  updated_at: string
  created_by: string
}

export interface WorkflowTriggerTable {
  id: string
  workflow_id: string
  template_id: string
  organization_id: string
  name: string
  description: string
  active: boolean
  config: TriggerConfig
  data_mapping: TriggerDataMapping
  last_triggered?: string
  trigger_count: number
  error_count: number
  created_at: string
  updated_at: string
  created_by: string
}

export interface TriggerEventTable {
  id: string
  trigger_id: string
  event_type: TriggerType
  event_data: Record<string, any>
  timestamp: string
  processed: boolean
  workflow_instance_id?: string
  error?: string
  processing_time_ms?: number
}

export interface TriggerMonitorTable {
  id: string
  trigger_id: string
  active: boolean
  last_check?: string
  next_check?: string
  status: 'healthy' | 'warning' | 'error' | 'disabled'
  error_message?: string
  check_interval: number
  created_at: string
  updated_at: string
}

// Admin Management Types
export interface TriggerStats {
  totalTriggers: number
  activeTriggers: number
  triggersByType: Record<TriggerType, number>
  triggersByCategory: Record<TriggerCategory, number>
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  averageProcessingTime: number
  lastUpdated: string
}

export interface TriggerOperation {
  type: 'create' | 'update' | 'delete' | 'activate' | 'deactivate' | 'test'
  triggerId: string
  timestamp: string
  userId: string
  changes?: Record<string, any>
  result?: 'success' | 'error'
  error?: string
}

// Export utility types
export type CreateTriggerTemplateRequest = Omit<TriggerTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
export type UpdateTriggerTemplateRequest = Partial<CreateTriggerTemplateRequest>
export type CreateWorkflowTriggerRequest = Omit<WorkflowTrigger, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'triggerCount' | 'errorCount'>
export type UpdateWorkflowTriggerRequest = Partial<CreateWorkflowTriggerRequest>

export type TriggerFilter = {
  type?: TriggerType
  category?: TriggerCategory
  active?: boolean
  workflowId?: string
  search?: string
}