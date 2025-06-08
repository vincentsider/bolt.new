# WorkflowHub Data Models

## Core Entities

### 1. Workflow Definition

```typescript
interface Workflow {
  id: string
  organizationId: string
  name: string
  description: string
  version: number
  status: 'draft' | 'published' | 'archived'
  
  // Natural language spec that generated this workflow
  prompt?: string
  
  // Workflow configuration
  config: {
    triggers: WorkflowTrigger[]
    steps: WorkflowStep[]
    settings: WorkflowSettings
  }
  
  // Metadata
  createdBy: string
  updatedBy: string
  publishedBy?: string
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
  
  // Permissions
  permissions: {
    executors: string[] // user/role IDs who can run
    editors: string[]   // user/role IDs who can edit
    viewers: string[]   // user/role IDs who can view
  }
}

interface WorkflowSettings {
  slaMinutes?: number
  notificationChannels: NotificationChannel[]
  errorHandling: 'stop' | 'continue' | 'retry'
  maxRetries: number
  timeoutMinutes: number
}
```

### 2. Workflow Steps

```typescript
interface WorkflowStep {
  id: string
  type: 'capture' | 'review' | 'approve' | 'update' | 'condition' | 'parallel'
  name: string
  description?: string
  
  // Step configuration varies by type
  config: CaptureStep | ReviewStep | ApproveStep | UpdateStep | ConditionStep | ParallelStep
  
  // Connections
  nextSteps: StepConnection[]
  
  // Optional Arcade integration
  arcadeTool?: {
    name: string
    version?: string
    inputMapping: Record<string, string> // workflow field -> tool input
    outputMapping: Record<string, string> // tool output -> workflow field
  }
}

// Step Type Definitions
interface CaptureStep {
  type: 'capture'
  form: {
    fields: FormField[]
    validation: ValidationRule[]
  }
  datasources?: DataSource[]
}

interface ReviewStep {
  type: 'review'
  reviewers: Reviewer[]
  reviewType: 'sequential' | 'parallel' | 'any'
  escalation?: {
    afterMinutes: number
    escalateTo: string
  }
}

interface ApproveStep {
  type: 'approve'
  approvers: Approver[]
  approvalType: 'all' | 'any' | 'threshold'
  threshold?: number
  delegation: boolean
  comments: 'optional' | 'required'
}

interface UpdateStep {
  type: 'update'
  system: string // 'arcade' for Arcade tools, or internal system ID
  action: string
  fieldMapping: Record<string, any>
  errorHandling: 'fail' | 'continue' | 'compensate'
}

interface ConditionStep {
  type: 'condition'
  conditions: Condition[]
  operator: 'and' | 'or'
}

interface ParallelStep {
  type: 'parallel'
  branches: WorkflowStep[][]
  joinType: 'all' | 'any' | 'race'
}
```

### 3. Form Components

```typescript
interface FormField {
  id: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 
        'file' | 'signature' | 'table' | 'currency' | 'email' | 'phone'
  label: string
  placeholder?: string
  required: boolean
  defaultValue?: any
  
  // Field-specific config
  config: FieldConfig
  
  // Conditional visibility
  visibility?: {
    condition: Condition
    dependsOn: string[] // field IDs
  }
}

interface FieldConfig {
  // Text fields
  minLength?: number
  maxLength?: number
  pattern?: string
  
  // Number/Currency fields
  min?: number
  max?: number
  decimals?: number
  currency?: string
  
  // Select fields
  options?: SelectOption[]
  allowCustom?: boolean
  
  // File fields
  accept?: string[]
  maxSize?: number
  maxFiles?: number
  
  // Table fields
  columns?: TableColumn[]
  minRows?: number
  maxRows?: number
}
```

### 4. Workflow Execution

```typescript
interface WorkflowExecution {
  id: string
  workflowId: string
  workflowVersion: number
  organizationId: string
  
  // Execution state
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
  currentSteps: string[] // step IDs currently active
  
  // Execution context
  context: {
    initiator: {
      type: 'user' | 'api' | 'trigger' | 'schedule'
      id: string
      metadata?: Record<string, any>
    }
    data: Record<string, any> // workflow variables
    files: FileAttachment[]
  }
  
  // Timing
  startedAt: Date
  completedAt?: Date
  slaDeadline?: Date
  
  // History
  stepHistory: StepExecution[]
  
  // Errors
  errors: WorkflowError[]
}

interface StepExecution {
  stepId: string
  stepName: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  
  // Who performed the action
  actor?: {
    type: 'user' | 'system' | 'api'
    id: string
    name: string
  }
  
  // Step data
  input: Record<string, any>
  output: Record<string, any>
  
  // Arcade execution details (if applicable)
  arcadeExecution?: {
    toolName: string
    executionId: string
    status: string
    output: any
    error?: any
  }
  
  // Timing
  startedAt: Date
  completedAt?: Date
  duration: number
  
  // Audit
  actions: StepAction[]
}

interface StepAction {
  type: 'submit' | 'approve' | 'reject' | 'delegate' | 'comment' | 'save'
  actor: string
  timestamp: Date
  data?: any
  comment?: string
}
```

### 5. Triggers & Scheduling

```typescript
interface WorkflowTrigger {
  id: string
  type: 'manual' | 'schedule' | 'webhook' | 'event' | 'api'
  enabled: boolean
  
  config: ManualTrigger | ScheduleTrigger | WebhookTrigger | EventTrigger | ApiTrigger
}

interface ScheduleTrigger {
  type: 'schedule'
  cron: string
  timezone: string
  data?: Record<string, any> // default data for scheduled runs
}

interface WebhookTrigger {
  type: 'webhook'
  url: string // generated unique URL
  secret: string
  validation?: {
    headers?: Record<string, string>
    ipWhitelist?: string[]
  }
}

interface EventTrigger {
  type: 'event'
  source: 'arcade' | 'internal'
  eventType: string
  filters?: Record<string, any>
}
```

### 6. Component Library System

```typescript
// Pre-built workflow component library
interface WorkflowComponent {
  id: string
  category: 'input' | 'logic' | 'integration' | 'notification'
  name: string
  description: string
  icon: string
  
  // Component template and configuration
  template: ComponentTemplate
  configSchema: JSONSchema
  uiGuidelines: UIGuidelines
  
  // AI suggestion metadata
  confidence?: number
  reasoning?: string
  
  // Library metadata
  tags: string[]
  author: string
  version: string
  usage: ComponentUsage
}

interface ComponentTemplate {
  type: WorkflowStepType
  config: any // Step-specific configuration
  defaultName: string
  requiredInputs: string[]
  outputFields: string[]
}

// UI Guidelines for consistent interface
interface UIGuidelines {
  layout: {
    spacing: Record<string, string>
    grid: { columns: number, gutter: string }
    forms: { fieldSpacing: string, maxWidth: string }
  }
  styling: {
    colors: Record<string, string>
    typography: Record<string, string>
    borders: { radius: string, width: string }
    shadows: Record<string, string>
  }
  interaction: {
    animations: { duration: string, easing: string }
    feedback: Record<string, any>
  }
  accessibility: {
    minContrastRatio: number
    focusVisible: boolean
    keyboardNavigation: boolean
  }
}

// Component library categories
const COMPONENT_CATEGORIES = {
  'input': [
    'form-capture',      // Data collection forms
    'file-upload',       // Document uploads with OCR
    'signature-capture', // Digital signatures
    'table-input'        // Structured data entry
  ],
  'logic': [
    'approval-flow',     // Sequential/parallel approvals
    'conditional-routing', // If/then logic
    'data-validation',   // Validation rules
    'parallel-execution' // Split/join workflows
  ],
  'integration': [
    'salesforce-create', // CRM integrations
    'slack-notification', // Communication
    'email-sender',      // Email automation
    'quickbooks-expense' // Finance systems
  ],
  'notification': [
    'email-template',    // Rich email notifications
    'sms-alert',         // SMS notifications
    'dashboard-update',  // Real-time updates
    'webhook-trigger'    // External system callbacks
  ]
}

interface ComponentUsage {
  totalUses: number
  organizationsUsing: string[]
  averageRating: number
  lastUsed: Date
  popularity: 'high' | 'medium' | 'low'
}

// Workflow templates built from components
interface WorkflowTemplate {
  id: string
  name: string
  category: 'finance' | 'hr' | 'operations' | 'compliance' | 'custom'
  description: string
  
  // Component-based workflow structure
  components: TemplateComponent[]
  connections: ComponentConnection[]
  
  // Template metadata
  parameters: TemplateParameter[]
  usage: TemplateUsage
  rating: number
  featured: boolean
}

interface TemplateComponent {
  componentId: string
  position: { x: number, y: number }
  config: any // Pre-configured component settings
  customizations: ComponentCustomization[]
}

interface ComponentConnection {
  fromComponent: string
  toComponent: string
  condition?: string
  dataMapping?: Record<string, string>
}
```

### 7. Analytics & Reporting

```typescript
interface WorkflowAnalytics {
  workflowId: string
  period: 'day' | 'week' | 'month' | 'quarter'
  date: Date
  
  metrics: {
    executions: {
      total: number
      completed: number
      failed: number
      cancelled: number
      avgDuration: number
      slaBreaches: number
    }
    
    steps: Record<string, {
      executions: number
      avgDuration: number
      errors: number
      bottleneckScore: number
    }>
    
    users: {
      unique: number
      byRole: Record<string, number>
      topPerformers: {userId: string, completions: number}[]
    }
  }
}
```

### 8. Database Schema (PostgreSQL/Supabase)

```sql
-- Core tables
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  prompt TEXT,
  config JSONB NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  published_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  workflow_version INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  status VARCHAR(50) NOT NULL,
  current_steps TEXT[],
  context JSONB NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ
);

CREATE TABLE step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),
  step_id VARCHAR(255) NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  actor JSONB,
  input JSONB,
  output JSONB,
  arcade_execution JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration INTEGER
);

-- Component library tables
CREATE TABLE workflow_components (
  id VARCHAR(255) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  template JSONB NOT NULL,
  config_schema JSONB NOT NULL,
  ui_guidelines JSONB NOT NULL,
  tags TEXT[],
  author VARCHAR(255),
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE component_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id VARCHAR(255) NOT NULL REFERENCES workflow_components(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workflow_id UUID REFERENCES workflows(id),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  components JSONB NOT NULL,
  connections JSONB NOT NULL,
  parameters JSONB DEFAULT '[]',
  featured BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view workflows in their organization"
  ON workflows FOR SELECT
  USING (organization_id = auth.jwt()->>'organization_id');

CREATE POLICY "Builders can create/edit workflows"
  ON workflows FOR ALL
  USING (
    organization_id = auth.jwt()->>'organization_id' 
    AND auth.jwt()->>'role' IN ('admin', 'builder')
  );
```

## State Management (Frontend)

```typescript
// Using nanostores (existing in codebase)
import { atom, map } from 'nanostores'

// Workflow builder state
export const currentWorkflow = map<Workflow>()
export const selectedStep = atom<string | null>(null)
export const isDirty = atom<boolean>(false)

// Execution monitoring state
export const activeExecutions = map<Record<string, WorkflowExecution>>()
export const executionFilters = map({
  status: 'all',
  dateRange: 'today',
  workflow: null
})

// Form builder state
export const formFields = map<Record<string, FormField>>()
export const fieldValidation = map<Record<string, ValidationResult>>()
```

## Next Steps

1. **Implement Core Models**: Start with Workflow and WorkflowStep
2. **Set up Database**: Create Supabase tables with RLS
3. **Build Type Guards**: Runtime validation for workflow configs
4. **Create Factories**: Helper functions to create valid workflows
5. **Add Migrations**: Version control for schema changes

---

*Status: Ready for Implementation*
*Next: Arcade Integration Architecture*