// Component Library Type Definitions
// Based on PRD Component Library specification

export type ComponentGroup = 
  | 'basic_inputs'
  | 'document_handling'
  | 'lookups_status'
  | 'financial_specific'
  | 'layout_helpers'
  | 'approval_signoff'
  | 'automation_hooks'

export type ComponentType = 
  // Basic Inputs
  | 'short_text_box'
  | 'long_text_box'
  | 'number_field'
  | 'date_picker'
  | 'dropdown_list'
  | 'multi_select_list'
  | 'yes_no_buttons'
  | 'checkbox'
  | 'checklist'
  // Document Handling
  | 'file_upload'
  | 'sharepoint_link'
  | 'document_viewer'
  // Look-ups & Status
  | 'record_search'
  | 'status_badge'
  // Financial-Specific
  | 'currency_amount'
  | 'risk_score_meter'
  // Layout Helpers
  | 'section_accordion'
  | 'step_progress_bar'
  | 'review_table'
  // Approval & Sign-off
  | 'approve_reject_buttons'
  | 'digital_signature_box'
  | 'confirmation_tick'
  // Automation Hooks
  | 'hidden_api_push'
  | 'ocr_extractor'
  | 'audit_logger'

export type WorkflowStepType = 'capture' | 'review' | 'approval' | 'update'

export interface ComponentProperty {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean
  defaultValue?: any
  description: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
  }
}

export interface AIKeyword {
  keyword: string
  weight: number // 1-10, higher = more likely to match
  context?: string[] // Additional context words that strengthen the match
}

export interface ComponentDefinition {
  id: string
  name: string
  description: string
  group: ComponentGroup
  type: ComponentType
  
  // Admin configuration
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  
  // AI Mapping
  aiKeywords: AIKeyword[]
  typicalExamples: string[]
  
  // Component Properties
  properties: ComponentProperty[]
  
  // Rendering Information
  icon: string
  color: string
  
  // Step Compatibility
  compatibleSteps: WorkflowStepType[]
  
  // Code Generation
  htmlTemplate: string
  cssClasses: string[]
  jsValidation?: string
  
  // Integration
  apiEndpoint?: string
  dataMapping?: Record<string, string>
}

export interface ComponentInstance {
  id: string
  componentId: string // Reference to ComponentDefinition
  label: string
  required: boolean
  config: Record<string, any> // Instance-specific configuration
  validation: {
    rules: string[]
    errorMessage?: string
  }
  position: {
    step: WorkflowStepType
    order: number
  }
  dataMapping?: {
    sourceField?: string
    targetSystem?: string
    targetField?: string
  }
}

export interface ComponentLibrary {
  id: string
  organizationId: string
  name: string
  description: string
  version: string
  components: ComponentDefinition[]
  isDefault: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

// AI Component Mapping Types
export interface ComponentMatch {
  component: ComponentDefinition
  confidence: number // 0-1
  reasons: string[] // Why this component was selected
  suggestedConfig: Record<string, any>
}

export interface ComponentSuggestion {
  userInput: string
  detectedIntent: string
  targetStep: WorkflowStepType
  matches: ComponentMatch[]
  autoSelected?: ComponentDefinition
}

// Component Rendering Types
export interface RenderedComponent {
  instance: ComponentInstance
  definition: ComponentDefinition
  html: string
  css: string
  js?: string
  validation: {
    required: boolean
    rules: ValidationRule[]
  }
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom'
  value?: any
  message: string
}

// Database Models (for Supabase)
export interface ComponentLibraryTable {
  id: string
  organization_id: string
  name: string
  description: string
  version: string
  is_default: boolean
  active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

export interface ComponentDefinitionTable {
  id: string
  library_id: string
  name: string
  description: string
  group: ComponentGroup
  type: ComponentType
  active: boolean
  ai_keywords: AIKeyword[]
  typical_examples: string[]
  properties: ComponentProperty[]
  icon: string
  color: string
  compatible_steps: WorkflowStepType[]
  html_template: string
  css_classes: string[]
  js_validation?: string
  api_endpoint?: string
  data_mapping?: Record<string, string>
  created_at: string
  updated_at: string
  created_by: string
}

export interface ComponentInstanceTable {
  id: string
  workflow_id: string
  component_id: string
  label: string
  required: boolean
  config: Record<string, any>
  validation: any
  position: any
  data_mapping?: any
  created_at: string
  updated_at: string
}

// Admin Management Types
export interface ComponentStats {
  totalComponents: number
  activeComponents: number
  componentsByGroup: Record<ComponentGroup, number>
  usageStats: Record<string, number>
  lastUpdated: string
}

export interface ComponentOperation {
  type: 'create' | 'update' | 'delete' | 'activate' | 'deactivate'
  componentId: string
  timestamp: string
  userId: string
  changes?: Record<string, any>
}

// Export utility types
export type CreateComponentRequest = Omit<ComponentDefinition, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
export type UpdateComponentRequest = Partial<CreateComponentRequest>
export type ComponentFilter = {
  group?: ComponentGroup
  active?: boolean
  step?: WorkflowStepType
  search?: string
}