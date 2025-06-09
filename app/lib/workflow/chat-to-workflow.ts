import type { WorkflowStep, Workflow, ArcadeToolConfig } from '~/types/database'

export interface WorkflowDetection {
  isWorkflowRequest: boolean
  confidence: number
  suggestedWorkflow?: Workflow
  suggestedSteps?: WorkflowStep[]
  intent?: string
  entities?: WorkflowEntity[]
}

export interface WorkflowEntity {
  type: 'trigger' | 'action' | 'condition' | 'integration' | 'schedule' | 'approval' | 'notification'
  value: string
  confidence: number
  position: { start: number; end: number }
  metadata?: Record<string, any>
}

// Keywords that indicate workflow creation intent - EXPANDED for better detection
const WORKFLOW_KEYWORDS = [
  'workflow', 'automate', 'automation', 'process', 'flow', 'pipeline',
  'trigger', 'when', 'if', 'then', 'approve', 'approval', 'review', 'notify',
  'schedule', 'daily', 'weekly', 'monthly', 'integrate', 'connect',
  'send email', 'create task', 'update data', 'validate', 'check',
  'expense', 'invoice', 'report', 'request', 'submit', 'create a workflow',
  // EXPANDED: Common form/business process keywords
  'form', 'feedback', 'survey', 'application', 'registration', 'contact',
  'onboarding', 'customer', 'employee', 'user', 'collect', 'gather',
  'manage', 'track', 'handle', 'submit', 'processing', 'business',
  'step', 'steps', 'sequence', 'order', 'procedure'
]

// Common workflow patterns - EXPANDED for better detection
const WORKFLOW_PATTERNS = [
  /when\s+(.+?)\s+then\s+(.+)/i,
  /if\s+(.+?)\s+then\s+(.+)/i,
  /automate\s+(.+)/i,
  /create\s+(?:a\s+)?workflow\s+(?:to\s+|that\s+|for\s+)?(.+)/i,
  /i\s+(?:want|need)\s+(?:to\s+)?automate\s+(.+)/i,
  /help\s+me\s+(?:automate|create\s+a\s+workflow\s+for)\s+(.+)/i,
  /build\s+(?:a\s+)?workflow\s+(?:to\s+|that\s+|for\s+)?(.+)/i,
  // EXPANDED: Common business form patterns
  /create\s+(?:a\s+)?(.+?)\s+form/i,
  /build\s+(?:a\s+)?(.+?)\s+form/i,
  /make\s+(?:a\s+)?(.+?)\s+form/i,
  /generate\s+(?:a\s+)?(.+?)\s+form/i,
  /i\s+need\s+(?:a\s+)?(.+?)\s+(?:form|system|process)/i,
  /create\s+(?:a\s+)?(.+?)\s+(?:application|system|process)/i,
  /build\s+(?:a\s+)?(.+?)\s+(?:application|system|process)/i,
  /design\s+(?:a\s+)?(.+?)\s+(?:form|workflow|process)/i
]

// Step type mappings - only valid WorkflowStep types
const STEP_TYPE_MAPPING: Record<string, 'capture' | 'review' | 'approve' | 'update' | 'condition' | 'parallel'> = {
  'email': 'update',
  'send email': 'update',
  'notify': 'update',
  'notification': 'update',
  'approve': 'approve',
  'approval': 'approve',
  'review': 'review',
  'check': 'condition',
  'validate': 'condition',
  'condition': 'condition',
  'wait': 'condition',
  'delay': 'condition',
  'schedule': 'condition',
  'update': 'update',
  'create': 'capture',
  'input': 'capture',
  'form': 'capture',
  'data': 'capture',
  'transform': 'update',
  'convert': 'update',
  'calculate': 'update',
  'parallel': 'parallel',
  'simultaneously': 'parallel',
  'human task': 'review',
  'manual': 'review',
  'task': 'review'
}

/**
 * Analyzes chat input to detect workflow creation intent
 */
export function detectWorkflowIntent(input: string): WorkflowDetection {
  const lowerInput = input.toLowerCase()
  
  // Special case: explicit workflow creation request
  if (lowerInput.includes('create a workflow') || lowerInput.includes('build a workflow')) {
    const entities = extractWorkflowEntities(input)
    const suggestedSteps = generateWorkflowSteps(input, entities)
    const suggestedWorkflow = createSuggestedWorkflow(input, input, entities, suggestedSteps)
    
    return {
      isWorkflowRequest: true,
      confidence: 1.0,
      suggestedWorkflow,
      suggestedSteps,
      intent: input,
      entities
    }
  }
  
  // Check for workflow keywords
  const keywordMatches = WORKFLOW_KEYWORDS.filter(keyword => 
    lowerInput.includes(keyword.toLowerCase())
  )
  
  // Calculate confidence based on keyword matches - ENHANCED scoring
  let confidence = Math.min(keywordMatches.length * 0.3, 1.0)
  
  // Special boost for form-related requests (common business need)
  if (lowerInput.includes('form') || lowerInput.includes('feedback') || 
      lowerInput.includes('contact') || lowerInput.includes('survey') ||
      lowerInput.includes('application') || lowerInput.includes('registration')) {
    confidence = Math.max(confidence, 0.8)
  }
  
  // Check for workflow patterns
  let matchedPattern: RegExpMatchArray | null = null
  let intent = ''
  
  for (const pattern of WORKFLOW_PATTERNS) {
    const match = input.match(pattern)
    if (match) {
      matchedPattern = match
      intent = match[1] || match[0]
      confidence = Math.max(confidence, 0.8)
      break
    }
  }
  
  // LOWERED threshold for better detection of business processes
  const isWorkflowRequest = confidence > 0.15
  
  if (!isWorkflowRequest) {
    return { isWorkflowRequest: false, confidence: 0 }
  }
  
  // Extract entities (triggers, actions, conditions)
  const entities = extractWorkflowEntities(input)
  
  // Generate suggested workflow steps
  const suggestedSteps = generateWorkflowSteps(input, entities)
  
  // Create suggested workflow
  const suggestedWorkflow = createSuggestedWorkflow(input, intent, entities, suggestedSteps)
  
  return {
    isWorkflowRequest: true,
    confidence,
    suggestedWorkflow,
    suggestedSteps,
    intent: intent || input,
    entities
  }
}

/**
 * Extracts workflow entities from text
 */
function extractWorkflowEntities(input: string): WorkflowEntity[] {
  const entities: WorkflowEntity[] = []
  const lowerInput = input.toLowerCase()
  
  // Extract triggers
  const triggerPatterns = [
    /when\s+(.+?)(?:\s+then|\s+,|$)/i,
    /if\s+(.+?)(?:\s+then|\s+,|$)/i,
    /after\s+(.+?)(?:\s+then|\s+,|$)/i,
    /on\s+(.+?)(?:\s+then|\s+,|$)/i
  ]
  
  for (const pattern of triggerPatterns) {
    const match = input.match(pattern)
    if (match) {
      entities.push({
        type: 'trigger',
        value: match[1].trim(),
        confidence: 0.8,
        position: { start: match.index!, end: match.index! + match[0].length }
      })
    }
  }
  
  // Extract actions
  const actionPatterns = [
    /then\s+(.+?)(?:\s+and|\s+,|$)/i,
    /send\s+(.+?)(?:\s+to|\s+,|$)/i,
    /create\s+(.+?)(?:\s+in|\s+,|$)/i,
    /update\s+(.+?)(?:\s+with|\s+,|$)/i,
    /notify\s+(.+?)(?:\s+about|\s+,|$)/i
  ]
  
  for (const pattern of actionPatterns) {
    const match = input.match(pattern)
    if (match) {
      entities.push({
        type: 'action',
        value: match[1].trim(),
        confidence: 0.7,
        position: { start: match.index!, end: match.index! + match[0].length }
      })
    }
  }
  
  // Extract integrations
  const integrationKeywords = [
    'slack', 'email', 'teams', 'jira', 'github', 'salesforce', 
    'hubspot', 'zapier', 'webhook', 'api', 'database', 'spreadsheet',
    'google sheets', 'excel', 'trello', 'asana', 'notion'
  ]
  
  integrationKeywords.forEach(keyword => {
    const index = lowerInput.indexOf(keyword)
    if (index !== -1) {
      entities.push({
        type: 'integration',
        value: keyword,
        confidence: 0.9,
        position: { start: index, end: index + keyword.length }
      })
    }
  })
  
  return entities
}

/**
 * Generates workflow steps based on input and entities
 */
function generateWorkflowSteps(input: string, entities: WorkflowEntity[]): WorkflowStep[] {
  const steps: WorkflowStep[] = []
  let stepCounter = 1
  
  // Extract step intentions from input
  const stepPatterns = [
    /(?:then|and)\s+([^,\.]+)/gi,
    /(?:step\s+\d+[:]\s*)?([^,\.]+?)(?:\s+(?:then|and|$))/gi
  ]
  
  const stepTexts: string[] = []
  
  for (const pattern of stepPatterns) {
    let match
    while ((match = pattern.exec(input)) !== null) {
      const stepText = match[1].trim()
      if (stepText.length > 3 && !stepTexts.includes(stepText)) {
        stepTexts.push(stepText)
      }
    }
  }
  
  // If no clear steps found, extract from entities
  if (stepTexts.length === 0) {
    entities.forEach(entity => {
      if (entity.type === 'action') {
        stepTexts.push(entity.value)
      }
    })
  }
  
  // If still no steps, create default steps based on input analysis
  if (stepTexts.length === 0) {
    stepTexts.push(input) // Use the entire input as a single step
  }
  
  // If it's an expense approval workflow, create specific steps
  if (input.toLowerCase().includes('expense') && input.toLowerCase().includes('approve')) {
    // Create expense approval workflow steps
    steps.push({
      id: 'step-1',
      type: 'capture',
      name: 'Submit Expense Report',
      description: 'Employee submits expense report with details and receipts',
      config: {
        fields: [
          { name: 'amount', type: 'number', required: true },
          { name: 'category', type: 'select', required: true },
          { name: 'description', type: 'text', required: true },
          { name: 'receipts', type: 'file', required: true }
        ],
        required: true
      },
      nextSteps: [{ stepId: 'step-2' }],
      arcadeTool: undefined
    })
    
    // Check if amount threshold is mentioned
    const amountMatch = input.match(/\$?(\d+)/);
    const threshold = amountMatch ? parseInt(amountMatch[1]) : 500;
    
    steps.push({
      id: 'step-2',
      type: 'condition',
      name: 'Check Amount Threshold',
      description: `Route based on expense amount (threshold: $${threshold})`,
      config: {
        field: 'amount',
        operator: 'greater_than',
        value: threshold
      },
      nextSteps: [
        { stepId: 'step-3', condition: { field: 'amount', operator: 'greater', value: threshold } },
        { stepId: 'step-4', condition: { field: 'amount', operator: 'less', value: threshold + 1 } }
      ],
      arcadeTool: undefined
    })
    
    steps.push({
      id: 'step-3',
      type: 'approve',
      name: 'Manager Approval',
      description: 'Manager reviews and approves high-value expense',
      config: {
        approver: 'manager',
        deadline: '2 days'
      },
      nextSteps: [{ stepId: 'step-5' }],
      arcadeTool: undefined
    })
    
    steps.push({
      id: 'step-4',
      type: 'approve',
      name: 'Auto-Approve',
      description: 'Automatically approve low-value expenses',
      config: {
        approver: 'system',
        deadline: null
      },
      nextSteps: [{ stepId: 'step-5' }],
      arcadeTool: undefined
    })
    
    steps.push({
      id: 'step-5',
      type: 'update',
      name: 'Send Confirmation',
      description: 'Notify employee of approval status',
      config: {
        channels: ['email'],
        template: 'Your expense report has been processed',
        recipients: ['submitter']
      },
      nextSteps: [],
      arcadeTool: {
        name: 'sendgrid-send-email',
        inputMapping: { recipients: 'submitter', template: 'expense_notification' },
        outputMapping: { result: 'notification_sent' }
      }
    })
  } else {
    // Generate steps from extracted texts for other workflows
    stepTexts.forEach((stepText, index) => {
      const stepType = inferStepType(stepText)
      const step: WorkflowStep = {
        id: `step-${stepCounter++}`,
        type: stepType,
        name: generateStepName(stepText, stepType),
        description: stepText,
        config: generateStepConfig(stepType, stepText, entities),
        nextSteps: index < stepTexts.length - 1 ? [{ stepId: `step-${stepCounter}` }] : [],
        arcadeTool: inferArcadeTool(stepText, entities) || undefined
      }
      steps.push(step)
    })
  }
  
  // If no steps generated, create a basic workflow
  if (steps.length === 0) {
    steps.push({
      id: 'step-1',
      type: 'capture',
      name: 'Start Workflow',
      description: 'Initial step for the workflow',
      config: { fields: [], required: true },
      nextSteps: [],
      arcadeTool: undefined
    })
  }
  
  return steps
}

/**
 * Generates step name based on text and type
 */
function generateStepName(text: string, stepType: string): string {
  // Clean up the text
  const cleanText = text
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim()
    .split(' ')
    .slice(0, 4) // Take first 4 words
    .join(' ')
  
  // Add appropriate prefix based on step type
  const prefixes: Record<string, string> = {
    'capture': 'Capture',
    'review': 'Review',
    'approve': 'Approve',
    'update': 'Update',
    'condition': 'Check',
    'parallel': 'Process',
    'delay': 'Wait',
    'notification': 'Notify',
    'transform': 'Transform',
    'human_task': 'Task'
  }
  
  const prefix = prefixes[stepType] || 'Process'
  
  // If text already starts with action word, use it as-is
  const actionWords = ['capture', 'review', 'approve', 'update', 'check', 'wait', 'notify', 'send', 'create', 'process']
  const firstWord = cleanText.toLowerCase().split(' ')[0]
  
  if (actionWords.includes(firstWord)) {
    return cleanText.charAt(0).toUpperCase() + cleanText.slice(1)
  }
  
  return `${prefix} ${cleanText}`.trim()
}

/**
 * Infers step type from text
 */
function inferStepType(text: string): 'capture' | 'review' | 'approve' | 'update' | 'condition' | 'parallel' {
  const lowerText = text.toLowerCase()
  
  for (const [keyword, stepType] of Object.entries(STEP_TYPE_MAPPING)) {
    if (lowerText.includes(keyword)) {
      return stepType
    }
  }
  
  // Default inference based on text patterns - only return valid types
  if (lowerText.includes('email') || lowerText.includes('send') || lowerText.includes('notify')) {
    return 'update' // Use update for notifications since notification isn't a valid type
  }
  if (lowerText.includes('approve')) {
    return 'approve'
  }
  if (lowerText.includes('review')) {
    return 'review'
  }
  if (lowerText.includes('wait') || lowerText.includes('delay') || lowerText.includes('schedule')) {
    return 'condition' // Use condition for delays since delay isn't a valid type
  }
  if (lowerText.includes('check') || lowerText.includes('if') || lowerText.includes('condition')) {
    return 'condition'
  }
  if (lowerText.includes('update') || lowerText.includes('modify')) {
    return 'update'
  }
  if (lowerText.includes('create') || lowerText.includes('input') || lowerText.includes('form')) {
    return 'capture'
  }
  if (lowerText.includes('parallel') || lowerText.includes('simultaneously')) {
    return 'parallel'
  }
  
  return 'capture' // Default fallback to valid type
}

/**
 * Generates step configuration based on type and text
 */
function generateStepConfig(stepType: string, text: string, entities: WorkflowEntity[]): any {
  const baseConfigs: Record<string, any> = {
    'capture': { fields: [], required: true },
    'review': { reviewer: null, deadline: null },
    'approve': { approver: null, deadline: null },
    'update': { updates: {} },
    'condition': { field: '', operator: 'equals', value: '' },
    'parallel': { branches: [], wait_for: 'all' },
    'delay': { duration: 1, unit: 'minutes' },
    'notification': { channels: ['email'], template: text, recipients: [] },
    'transform': { mappings: [], calculations: [] },
    'human_task': { assignee: null, taskType: 'review', deadline: null }
  }
  
  let config = baseConfigs[stepType] || {}
  
  // Enhance config based on text analysis
  if (stepType === 'notification') {
    const channels = []
    if (text.toLowerCase().includes('email')) channels.push('email')
    if (text.toLowerCase().includes('slack')) channels.push('slack')
    if (text.toLowerCase().includes('teams')) channels.push('teams')
    if (channels.length > 0) {
      config.channels = channels
    }
    config.template = text
  }
  
  if (stepType === 'delay') {
    const timeMatch = text.match(/(\d+)\s*(minutes?|hours?|days?|weeks?)/i)
    if (timeMatch) {
      config.duration = parseInt(timeMatch[1])
      config.unit = timeMatch[2].toLowerCase().replace(/s$/, '') // Remove plural 's'
    }
  }
  
  return config
}

/**
 * Infers Arcade.dev tool based on text and entities
 */
function inferArcadeTool(text: string, entities: WorkflowEntity[]): ArcadeToolConfig | null {
  const integrationEntities = entities.filter(e => e.type === 'integration')
  
  if (integrationEntities.length > 0) {
    const integration = integrationEntities[0].value.toLowerCase()
    
    // Map common integrations to Arcade tools
    const arcadeMapping: Record<string, string> = {
      'slack': 'slack-send-message',
      'email': 'sendgrid-send-email',
      'teams': 'microsoft-teams-send-message',
      'jira': 'jira-create-issue',
      'github': 'github-create-issue',
      'salesforce': 'salesforce-create-record',
      'hubspot': 'hubspot-create-contact',
      'google sheets': 'google-sheets-add-row',
      'trello': 'trello-create-card',
      'asana': 'asana-create-task',
      'notion': 'notion-create-page'
    }
    
    const toolName = arcadeMapping[integration]
    return toolName ? {
      name: toolName,
      inputMapping: {},
      outputMapping: {}
    } : null
  }
  
  return null
}

/**
 * Generates workflow name from input
 */
function generateWorkflowName(input: string, intent?: string): string {
  // Special cases for common workflows
  const lowerInput = input.toLowerCase()
  
  if (lowerInput.includes('expense') && (lowerInput.includes('approve') || lowerInput.includes('approval'))) {
    return 'Expense Approval Workflow'
  }
  
  if (lowerInput.includes('invoice') && lowerInput.includes('process')) {
    return 'Invoice Processing Workflow'
  }
  
  if (lowerInput.includes('customer') && lowerInput.includes('onboarding')) {
    return 'Customer Onboarding Workflow'
  }
  
  if (lowerInput.includes('loan') && lowerInput.includes('application')) {
    return 'Loan Application Workflow'
  }
  
  if (lowerInput.includes('report') && lowerInput.includes('generation')) {
    return 'Report Generation Workflow'
  }
  
  if (intent && intent.length > 0) {
    // Clean up intent to create a proper name
    const cleanIntent = intent
      .replace(/[^\w\s]/g, '')
      .trim()
      .split(' ')
      .slice(0, 5)
      .join(' ')
    
    return cleanIntent.charAt(0).toUpperCase() + cleanIntent.slice(1)
  }
  
  // Extract name from input
  const match = input.match(/(?:create|build|automate)\s+(?:a\s+)?(?:workflow\s+)?(?:to\s+|that\s+|for\s+)?(.+?)(?:\.|$)/i)
  if (match) {
    const name = match[1].trim().split(' ').slice(0, 5).join(' ')
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  
  // Fallback
  return 'New Workflow'
}

/**
 * Extracts triggers from entities
 */
function extractTriggers(entities: WorkflowEntity[]): any[] {
  const triggers = entities
    .filter(e => e.type === 'trigger')
    .map(trigger => ({
      type: 'manual', // Default to manual trigger
      config: {
        description: trigger.value
      }
    }))
  
  return triggers.length > 0 ? triggers : [{ type: 'manual', config: {} }]
}

/**
 * Creates a suggested workflow object
 */
function createSuggestedWorkflow(input: string, intent: string, entities: WorkflowEntity[], suggestedSteps: WorkflowStep[]): Workflow {
  return {
    id: `workflow-${Date.now()}`,
    name: generateWorkflowName(input, intent),
    description: `Automated workflow: ${intent || input.slice(0, 100)}`,
    version: 1,
    status: 'draft',
    prompt: input,
    config: {
      triggers: extractTriggers(entities),
      steps: suggestedSteps,
      settings: {
        notificationChannels: [],
        errorHandling: 'stop',
        maxRetries: 3,
        timeoutMinutes: 60
      }
    },
    permissions: {
      executors: ['builder', 'approver', 'sysadmin'],
      editors: ['builder', 'sysadmin'],
      viewers: ['builder', 'reviewer', 'approver', 'auditor', 'sysadmin']
    },
    organization_id: '',
    created_by: '',
    updated_by: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}