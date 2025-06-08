// Database types matching Supabase schema

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'professional' | 'enterprise'
  settings: {
    ssoEnabled: boolean
    allowedDomains: string[]
  }
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id: string
  email: string
  role: 'builder' | 'reviewer' | 'approver' | 'auditor' | 'sysadmin'
  profile: {
    name: string
    avatar?: string
  }
  permissions: Permission[]
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Permission {
  resource: 'workflow' | 'integration' | 'user' | 'settings'
  actions: ('create' | 'read' | 'update' | 'delete' | 'execute')[]
}

export interface Workflow {
  id: string
  organization_id: string
  name: string
  description?: string
  version: number
  status: 'draft' | 'published' | 'archived'
  prompt?: string
  config: WorkflowConfig
  permissions: WorkflowPermissions
  created_by: string
  updated_by: string
  published_by?: string
  published_at?: string
  created_at: string
  updated_at: string
}

export interface WorkflowConfig {
  triggers: WorkflowTrigger[]
  steps: WorkflowStep[]
  settings: WorkflowSettings
}

export interface WorkflowSettings {
  slaMinutes?: number
  notificationChannels: NotificationChannel[]
  errorHandling: 'stop' | 'continue' | 'retry'
  maxRetries: number
  timeoutMinutes: number
}

export interface WorkflowPermissions {
  executors: string[]
  editors: string[]
  viewers: string[]
}

export interface WorkflowStep {
  id: string
  type: 'capture' | 'review' | 'approve' | 'update' | 'condition' | 'parallel'
  name: string
  description?: string
  config: StepConfig
  nextSteps: StepConnection[]
  arcadeTool?: ArcadeToolConfig
}

export interface StepConfig {
  // Union type for different step types
  [key: string]: any
}

export interface StepConnection {
  stepId: string
  condition?: Condition
}

export interface ArcadeToolConfig {
  name: string
  version?: string
  inputMapping: Record<string, string>
  outputMapping: Record<string, string>
}

export interface Condition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater' | 'less' | 'contains' | 'exists'
  value?: any
}

export interface WorkflowTrigger {
  id: string
  type: 'manual' | 'schedule' | 'webhook' | 'event' | 'api'
  enabled: boolean
  config: TriggerConfig
}

export interface TriggerConfig {
  [key: string]: any
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook'
  config: Record<string, any>
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  workflow_version: number
  organization_id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
  current_steps: string[]
  context: ExecutionContext
  started_at: string
  completed_at?: string
  sla_deadline?: string
  created_at: string
  updated_at: string
}

export interface ExecutionContext {
  initiator: {
    type: 'user' | 'api' | 'trigger' | 'schedule'
    id: string
    metadata?: Record<string, any>
  }
  data: Record<string, any>
  files: FileAttachment[]
}

export interface FileAttachment {
  id: string
  name: string
  url: string
  size: number
  type: string
}

export interface StepExecution {
  id: string
  execution_id: string
  step_id: string
  step_name: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  actor?: {
    type: 'user' | 'system' | 'api'
    id: string
    name: string
  }
  input: Record<string, any>
  output: Record<string, any>
  arcade_execution?: {
    toolName: string
    executionId: string
    status: string
    output: any
    error?: any
  }
  started_at: string
  completed_at?: string
  duration?: number
  created_at: string
  updated_at: string
}

export interface StepAction {
  id: string
  step_execution_id: string
  type: 'submit' | 'approve' | 'reject' | 'delegate' | 'comment' | 'save'
  actor_id: string
  timestamp: string
  data?: any
  comment?: string
}

export interface WorkflowComponent {
  id: string
  category: 'input' | 'logic' | 'integration' | 'notification'
  name: string
  description?: string
  icon?: string
  template: ComponentTemplate
  config_schema: any // JSON Schema
  ui_guidelines: UIGuidelines
  tags: string[]
  author?: string
  version: string
  created_at: string
  updated_at: string
}

export interface ComponentTemplate {
  type: WorkflowStep['type']
  config: any
  defaultName: string
  requiredInputs: string[]
  outputFields: string[]
}

export interface UIGuidelines {
  layout: Record<string, any>
  styling: Record<string, any>
  interaction: Record<string, any>
  accessibility: Record<string, any>
}

export interface ComponentUsage {
  id: string
  component_id: string
  organization_id: string
  workflow_id?: string
  used_at: string
  rating?: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  category: 'finance' | 'hr' | 'operations' | 'compliance' | 'custom'
  description?: string
  components: any[] // Template components
  connections: any[] // Component connections
  parameters: any[]
  featured: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  organization_id: string
  name: string
  key_hash: string
  permissions: Permission[]
  last_used?: string
  expires_at?: string
  created_by: string
  created_at: string
}

export interface AuditLog {
  id: string
  organization_id: string
  user_id?: string
  api_key_id?: string
  action: string
  resource: string
  resource_id?: string
  ip_address?: string
  user_agent?: string
  timestamp: string
  metadata?: Record<string, any>
}

// Supabase auth user type extension
export interface AuthUser {
  id: string
  email: string
  user_metadata: {
    name?: string
    avatar_url?: string
  }
  app_metadata: {
    organization_id?: string
    role?: User['role']
  }
}

// API response types
export interface DatabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count?: number
  error?: DatabaseError
}

// Form types for workflow builder
export interface FormField {
  id: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 
        'file' | 'signature' | 'table' | 'currency' | 'email' | 'phone'
  label: string
  placeholder?: string
  required: boolean
  defaultValue?: any
  config: FieldConfig
  visibility?: {
    condition: Condition
    dependsOn: string[]
  }
}

export interface FieldConfig {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
  decimals?: number
  currency?: string
  options?: SelectOption[]
  allowCustom?: boolean
  accept?: string[]
  maxSize?: number
  maxFiles?: number
  columns?: TableColumn[]
  minRows?: number
  maxRows?: number
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  required?: boolean
  config?: FieldConfig
}