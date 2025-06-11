// Trigger Library Type Definitions

export interface TriggerTemplate {
  id: string
  name: string
  description: string
  category: 'user_initiated' | 'time_based' | 'event_based' | 'system_based'
  configuration: Record<string, any>
  aiKeywords: string[]
  proactiveQuestions?: string[]
  validationRules?: Record<string, any>
  icon?: string
  color?: string
}

export interface TriggerConversation {
  id: string
  workflowId: string
  triggerId: string
  triggerName: string
  questions: string[]
  responses: Record<string, any>
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt?: Date
}

export interface TriggerExecution {
  id: string
  workflowId: string
  triggerId: string
  triggerType: string
  payload: Record<string, any>
  status: 'triggered' | 'processing' | 'completed' | 'failed'
  executedAt: Date
  completedAt?: Date
  error?: string
}

export interface TriggerLibrary {
  id: string
  organizationId: string
  name: string
  description: string
  triggers: TriggerTemplate[]
  isDefault: boolean
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TriggerInstance {
  id: string
  workflowId: string
  triggerId: string
  configuration: Record<string, any>
  active: boolean
  priority: number
  createdAt: Date
  updatedAt: Date
}