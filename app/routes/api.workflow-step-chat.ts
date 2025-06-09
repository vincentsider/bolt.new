import { type ActionFunctionArgs, json } from '@remix-run/cloudflare'
import { ComponentMapper } from '~/lib/ai/component-mapper'
import { TriggerMapper } from '~/lib/ai/trigger-mapper'
import type { WorkflowStep } from '~/types/database'
import type { ComponentDefinition, ComponentInstance } from '~/types/component-library'
import type { TriggerTemplate } from '~/types/trigger-library'

interface StepChatRequest {
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  currentStep: 'capture' | 'review' | 'approval' | 'update'
  workflowId?: string
  organizationId: string
  triggerContext?: {
    detectedTrigger?: TriggerTemplate
    triggerQuestions?: string[]
  }
}

interface StepChatResponse {
  stepUpdates?: {
    capture?: any
    review?: any
    approval?: any
    update?: any
  }
  suggestedComponents?: ComponentInstance[]
  triggerSuggestions?: {
    questions: string[]
    autoSelected?: TriggerTemplate
  }
  conversationalResponse: string
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const body = await request.json() as StepChatRequest
    const { messages, currentStep, organizationId, triggerContext } = body
    
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || ''
    
    // Initialize AI mappers
    const componentMapper = new ComponentMapper(organizationId)
    const triggerMapper = new TriggerMapper(organizationId)
    
    // Analyze user input for components
    const componentSuggestion = await componentMapper.mapComponents(lastUserMessage, currentStep)
    
    // Analyze user input for triggers (on first message only)
    let triggerSuggestions = null
    if (messages.length <= 2) { // New workflow
      const triggerSuggestion = await triggerMapper.suggestTriggers(lastUserMessage)
      if (triggerSuggestion.autoSelected || triggerSuggestion.options.length > 0) {
        const questions = triggerSuggestion.autoSelected 
          ? triggerMapper.generateProactiveQuestions(lastUserMessage, triggerSuggestion.autoSelected)
          : []
        
        triggerSuggestions = {
          questions,
          autoSelected: triggerSuggestion.autoSelected
        }
      }
    }
    
    // Generate step configuration based on user input
    const stepUpdates = await generateStepUpdates(lastUserMessage, currentStep, componentSuggestion)
    
    // Create conversational response
    const conversationalResponse = await generateConversationalResponse(
      lastUserMessage, 
      currentStep, 
      componentSuggestion,
      triggerSuggestions
    )
    
    const response: StepChatResponse = {
      stepUpdates,
      suggestedComponents: componentSuggestion.suggestions,
      triggerSuggestions,
      conversationalResponse
    }
    
    return json(response)
    
  } catch (error) {
    console.error('Workflow step chat error:', error)
    return json({ 
      error: 'Failed to process workflow step request' 
    }, { status: 500 })
  }
}

async function generateStepUpdates(
  userInput: string, 
  step: string, 
  componentSuggestion: any
): Promise<any> {
  // Parse user input to extract step-specific data
  const updates: any = {}
  
  switch (step) {
    case 'capture':
      updates.capture = {
        title: extractTitle(userInput) || `${extractWorkflowType(userInput)} Capture`,
        assignedTeam: extractTeam(userInput) || 'Default Team',
        dataFields: componentSuggestion.suggestions
          .filter((c: any) => c.component.group === 'basic_inputs')
          .map((c: any) => ({
            label: c.suggestedLabel || c.component.name,
            type: mapComponentToFieldType(c.component.type),
            required: c.suggestedRequired || false,
            validation: c.suggestedValidation || {}
          }))
      }
      break
      
    case 'review':
      updates.review = {
        title: `${extractWorkflowType(userInput)} Review`,
        assignedReviewer: extractReviewer(userInput) || 'Manager',
        displayInfo: extractDisplayInfo(userInput),
        allowEdit: extractAllowEdit(userInput)
      }
      break
      
    case 'approval':
      updates.approval = {
        title: `${extractWorkflowType(userInput)} Approval`,
        assignedApprover: extractApprover(userInput) || 'Senior Manager',
        autoApproval: extractAutoApproval(userInput),
        approvalCriteria: extractApprovalCriteria(userInput)
      }
      break
      
    case 'update':
      updates.update = {
        title: `${extractWorkflowType(userInput)} Processing`,
        integrations: extractIntegrations(userInput),
        notifications: extractNotifications(userInput),
        finalActions: extractFinalActions(userInput)
      }
      break
  }
  
  return updates
}

async function generateConversationalResponse(
  userInput: string,
  step: string,
  componentSuggestion: any,
  triggerSuggestions: any
): Promise<string> {
  let response = `I've analyzed your ${extractWorkflowType(userInput)} workflow request and updated the ${step} step. `
  
  if (componentSuggestion.suggestions.length > 0) {
    response += `I've added ${componentSuggestion.suggestions.length} components including ${componentSuggestion.suggestions.slice(0, 2).map((c: any) => c.component.name).join(' and ')}.`
  }
  
  if (triggerSuggestions && triggerSuggestions.questions.length > 0) {
    response += `\n\n**Trigger Configuration**: ${triggerSuggestions.questions[0]}`
  }
  
  response += `\n\nYou can see the updated workflow in the 4-Step Builder above. What would you like me to adjust or add to this ${step} step?`
  
  return response
}

// Helper functions to extract information from user input
function extractTitle(input: string): string | null {
  const patterns = [
    /(?:create|build|make).*?(\w+(?:\s+\w+)*?)(?:\s+workflow|\s+process|\s+form)/i,
    /([\w\s]+)(?:\s+submission|\s+approval|\s+request)/i
  ]
  
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return match[1].trim()
  }
  return null
}

function extractWorkflowType(input: string): string {
  const types = ['feedback', 'expense', 'approval', 'onboarding', 'review', 'request', 'submission']
  for (const type of types) {
    if (input.toLowerCase().includes(type)) {
      return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }
  return 'Workflow'
}

function extractTeam(input: string): string | null {
  const teamPattern = /(?:team|department|group)[\s:]*([A-Za-z\s]+)/i
  const match = input.match(teamPattern)
  return match ? match[1].trim() : null
}

function extractReviewer(input: string): string | null {
  const reviewerPattern = /(?:reviewer?|review(?:ed)?\s+by|manager|supervisor)[\s:]*([A-Za-z\s]+)/i
  const match = input.match(reviewerPattern)
  return match ? match[1].trim() : null
}

function extractApprover(input: string): string | null {
  const approverPattern = /(?:approver?|approved?\s+by|manager|director)[\s:]*([A-Za-z\s]+)/i
  const match = input.match(approverPattern)
  return match ? match[1].trim() : null
}

function mapComponentToFieldType(componentType: string): string {
  const mapping: Record<string, string> = {
    'text_input': 'text',
    'email_input': 'email',
    'number_input': 'number',
    'date_picker': 'date',
    'dropdown': 'dropdown',
    'file_upload': 'file'
  }
  return mapping[componentType] || 'text'
}

function extractDisplayInfo(input: string): string[] {
  const defaults = ['Data captured in previous step', 'Uploaded documents']
  // Could be enhanced to parse specific display requirements from input
  return defaults
}

function extractAllowEdit(input: string): boolean {
  return input.toLowerCase().includes('edit') || input.toLowerCase().includes('modify')
}

function extractAutoApproval(input: string): any {
  const autoPattern = /auto(?:matic)?(?:ally)?\s+approve(?:d?)?\s*(?:under|below|<)\s*[\$£€]?(\d+)/i
  const match = input.match(autoPattern)
  if (match) {
    return {
      enabled: true,
      threshold: parseInt(match[1]),
      condition: 'amount_under'
    }
  }
  return { enabled: false }
}

function extractApprovalCriteria(input: string): string[] {
  // Default criteria - could be enhanced to parse from input
  return ['Amount verification', 'Policy compliance', 'Documentation completeness']
}

function extractIntegrations(input: string): string[] {
  const integrations = []
  if (input.toLowerCase().includes('email')) integrations.push('Email notifications')
  if (input.toLowerCase().includes('slack')) integrations.push('Slack notifications') 
  if (input.toLowerCase().includes('database')) integrations.push('Database storage')
  if (input.toLowerCase().includes('crm')) integrations.push('CRM integration')
  return integrations.length > 0 ? integrations : ['Database storage', 'Email notifications']
}

function extractNotifications(input: string): string[] {
  return ['Email to submitter', 'Email to approver', 'Status update notifications']
}

function extractFinalActions(input: string): string[] {
  return ['Archive submission', 'Update audit log', 'Generate report']
}