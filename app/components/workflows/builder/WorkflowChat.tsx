import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '~/components/auth/AuthProvider'
import type { Workflow, WorkflowStep } from '~/types/database'
import { TriggerMapper } from '~/lib/ai/trigger-mapper'
import { ComponentMapper } from '~/lib/ai/component-mapper'
import type { TriggerConversation, TriggerTemplate } from '~/types/trigger-library'
import { workflowComponentActions, type ComponentInstance, $workflowStyling, type WorkflowStyling } from '~/stores/workflow-components'

interface WorkflowChatProps {
  workflow: Partial<Workflow>
  onWorkflowUpdate: (workflow: Partial<Workflow>) => void
  onCodeUpdate: (code: string) => void
  onFilesUpdate: (files: {[key: string]: string}) => void
  initialInput?: string | null
  forceFresh?: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  triggerConversation?: TriggerConversation
}

// Chat command processing functions
interface CommandResult {
  type: 'component' | 'styling' | 'structural' | 'none'
  action: string
  data: any
}

function parseUserCommand(input: string): CommandResult {
  const lowerInput = input.toLowerCase()
  
  // Component modification commands
  if (lowerInput.includes('add') && (lowerInput.includes('field') || lowerInput.includes('input'))) {
    return {
      type: 'component',
      action: 'add',
      data: parseAddFieldCommand(input)
    }
  }
  
  if (lowerInput.includes('make') && lowerInput.includes('optional')) {
    return {
      type: 'component', 
      action: 'update',
      data: { field: 'required', value: false, target: parseFieldTarget(input) }
    }
  }
  
  if (lowerInput.includes('make') && lowerInput.includes('required')) {
    return {
      type: 'component',
      action: 'update', 
      data: { field: 'required', value: true, target: parseFieldTarget(input) }
    }
  }
  
  if (lowerInput.includes('remove') || lowerInput.includes('delete')) {
    return {
      type: 'component',
      action: 'remove',
      data: { target: parseFieldTarget(input) }
    }
  }
  
  // Styling commands
  if (lowerInput.includes('color') || lowerInput.includes('background')) {
    return {
      type: 'styling',
      action: 'update',
      data: parseColorCommand(input)
    }
  }
  
  if (lowerInput.includes('button') && (lowerInput.includes('bigger') || lowerInput.includes('larger'))) {
    return {
      type: 'styling',
      action: 'update',
      data: { buttons: { size: 'large' } }
    }
  }
  
  if (lowerInput.includes('font') || lowerInput.includes('text size')) {
    return {
      type: 'styling',
      action: 'update',
      data: parseFontCommand(input)
    }
  }
  
  return { type: 'none', action: '', data: {} }
}

function parseAddFieldCommand(input: string): any {
  const lowerInput = input.toLowerCase()
  
  if (lowerInput.includes('email')) {
    return {
      componentId: 'email-input',
      label: 'Email Address',
      type: 'email'
    }
  }
  
  if (lowerInput.includes('phone')) {
    return {
      componentId: 'short-text-box',
      label: 'Phone Number', 
      type: 'tel'
    }
  }
  
  if (lowerInput.includes('file') || lowerInput.includes('upload')) {
    return {
      componentId: 'file-upload',
      label: 'File Upload',
      type: 'file'
    }
  }
  
  // Default text field
  return {
    componentId: 'short-text-box',
    label: 'New Field',
    type: 'text'
  }
}

function parseFieldTarget(input: string): string {
  const lowerInput = input.toLowerCase()
  
  if (lowerInput.includes('name')) return 'name'
  if (lowerInput.includes('email')) return 'email'  
  if (lowerInput.includes('phone')) return 'phone'
  if (lowerInput.includes('customer')) return 'customer'
  
  return 'field'
}

function parseColorCommand(input: string): Partial<WorkflowStyling> {
  const lowerInput = input.toLowerCase()
  
  if (lowerInput.includes('blue')) {
    return { theme: { primaryColor: '#007bff' } }
  }
  
  if (lowerInput.includes('green')) {
    return { theme: { primaryColor: '#28a745' } }
  }
  
  if (lowerInput.includes('red')) {
    return { theme: { primaryColor: '#dc3545' } }
  }
  
  if (lowerInput.includes('background') && lowerInput.includes('dark')) {
    return { theme: { backgroundColor: '#343a40' } }
  }
  
  return {}
}

function parseFontCommand(input: string): Partial<WorkflowStyling> {
  const lowerInput = input.toLowerCase()
  
  if (lowerInput.includes('larger') || lowerInput.includes('bigger')) {
    return { theme: { fontSize: '16px' } }
  }
  
  if (lowerInput.includes('smaller')) {
    return { theme: { fontSize: '12px' } }
  }
  
  if (lowerInput.includes('arial')) {
    return { theme: { fontFamily: 'Arial, sans-serif' } }
  }
  
  return {}
}

// NEW: Function to analyze user request and create component instances
async function createComponentInstancesFromRequest(
  userInput: string, 
  organizationId: string,
  workflowId: string,
  onWorkflowUpdate: (workflow: Partial<Workflow>) => void
): Promise<{[stepName: string]: any[]}> {
  try {
    console.log('🔍 Creating component instances from user request...')
    
    // Initialize component mapper
    const componentMapper = new ComponentMapper(organizationId)
    
    // Analyze user input for components across all steps
    const captureMapping = await componentMapper.mapComponents(userInput, 'capture')
    const reviewMapping = await componentMapper.mapComponents(userInput, 'review')
    const approvalMapping = await componentMapper.mapComponents(userInput, 'approval')
    const updateMapping = await componentMapper.mapComponents(userInput, 'update')
    
    // Convert mappings to component instances
    const captureComponents = captureMapping.matches.map((comp, index) => ({
      id: `comp-capture-${index}`,
      workflowId,
      componentId: comp.id,
      stepType: 'capture' as const,
      label: comp.name,
      required: true,
      config: comp.component_type === 'file-upload' ? { accept: '*', maxSize: '10MB' } : {},
      validation: {},
      position: { step: 1, order: index + 1 },
      dataMapping: {},
      styling: {}
    }))
    
    const reviewComponents = reviewMapping.matches.map((comp, index) => ({
      id: `comp-review-${index}`,
      workflowId,
      componentId: comp.id,
      stepType: 'review' as const,
      label: comp.name,
      required: true,
      config: {},
      validation: {},
      position: { step: 2, order: index + 1 },
      dataMapping: {},
      styling: {}
    }))
    
    const approvalComponents = approvalMapping.matches.map((comp, index) => ({
      id: `comp-approval-${index}`,
      workflowId,
      componentId: comp.id,
      stepType: 'approval' as const,
      label: comp.name,
      required: true,
      config: {},
      validation: {},
      position: { step: 3, order: index + 1 },
      dataMapping: {},
      styling: {}
    }))
    
    const updateComponents = updateMapping.matches.map((comp, index) => ({
      id: `comp-update-${index}`,
      workflowId,
      componentId: comp.id,
      stepType: 'update' as const,
      label: comp.name,
      required: true,
      config: {},
      validation: {},
      position: { step: 4, order: index + 1 },
      dataMapping: {},
      styling: {}
    }))
    
    console.log('📋 Component instances created:')
    console.log('- Capture:', captureComponents.length, 'components')
    console.log('- Review:', reviewComponents.length, 'components')
    console.log('- Approval:', approvalComponents.length, 'components')
    console.log('- Update:', updateComponents.length, 'components')
    
    // Helper function to map component IDs to field types
    const mapComponentToFieldType = (componentId: string): string => {
      switch (componentId) {
        case 'short-text-box': return 'text'
        case 'long-text-box': return 'text'
        case 'email-input': return 'email'
        case 'number-input': return 'number'
        case 'date-picker': return 'date'
        case 'dropdown-select': return 'dropdown'
        case 'file-upload': return 'file'
        default: return 'text'
      }
    }
    
    // Create workflow steps from component instances
    const workflowSteps: WorkflowStep[] = []
    
    if (captureComponents.length > 0) {
      // Convert component instances to fields format for WebContainer builder
      const fields = captureComponents.map(comp => ({
        name: comp.label.toLowerCase().replace(/\s+/g, '_'),
        label: comp.label,
        type: mapComponentToFieldType(comp.componentId),
        required: comp.required,
        validation: comp.validation || {}
      }))
      
      workflowSteps.push({
        id: 'step-1-capture',
        name: 'Data Capture',
        type: 'capture',
        description: 'Collect required information and documents',
        config: {
          fields
        },
        nextSteps: [{ stepId: 'step-2-review' }]
      })
    }
    
    // Always add review, approval, and update steps for complete workflow
    workflowSteps.push({
      id: 'step-2-review',
      name: 'Review & Validation',
      type: 'review',
      description: 'Review submitted information for accuracy',
      config: {
        reviewers: ['reviewer'],
        instructions: 'Review the submitted information'
      },
      nextSteps: [{ stepId: 'step-3-approval' }]
    })
    
    workflowSteps.push({
      id: 'step-3-approval',
      name: 'Approval Decision',
      type: 'approve',
      description: 'Formal approval or rejection',
      config: {
        approvers: ['manager'],
        conditions: []
      },
      nextSteps: [{ stepId: 'step-4-update' }]
    })
    
    workflowSteps.push({
      id: 'step-4-update',
      name: 'System Integration',
      type: 'update',
      description: 'Update external systems and send notifications',
      config: {
        integrations: [],
        notifications: true
      },
      nextSteps: []
    })
    
    // Update the workflow with component-based steps
    if (workflowSteps.length > 0) {
      console.log('🔄 Updating workflow with component-based steps')
      // This will be called from the parent to update both views
    }
    
    return {
      capture: captureComponents,
      review: reviewComponents,
      approval: approvalComponents,
      update: updateComponents
    }
    
  } catch (error) {
    console.error('Failed to create component instances:', error)
    return {}
  }
}

export function WorkflowChat({ workflow, onWorkflowUpdate, onCodeUpdate, onFilesUpdate, initialInput, forceFresh = false }: WorkflowChatProps) {
  const { user, organization } = useAuth()
  const [triggerMapper, setTriggerMapper] = useState<TriggerMapper | null>(null)
  const [activeTriggerConversation, setActiveTriggerConversation] = useState<TriggerConversation | null>(null)
  
  // Initialize TriggerMapper
  useEffect(() => {
    if (organization?.id) {
      const mapper = new TriggerMapper(organization.id)
      setTriggerMapper(mapper)
    }
  }, [organization?.id])
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Determine if this is a new workflow creation or continuing existing workflow
    const isNewWorkflow = !workflow.id && (!workflow.config?.steps || workflow.config.steps.length === 0)
    const chatKey = `workflow-chat-${workflow.name || 'default'}`
    
    // Force fresh start if explicitly requested or if it's a new workflow
    if (forceFresh || isNewWorkflow) {
      console.log('Starting fresh chat for new workflow creation (forceFresh:', forceFresh, ', isNewWorkflow:', isNewWorkflow, ')')
      // Clear any previous session data for fresh start
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(chatKey)
        sessionStorage.removeItem(`${chatKey}_was_new`)
      }
    } else if (typeof window !== 'undefined') {
      // Only restore messages for existing workflows when not forcing fresh
      const saved = sessionStorage.getItem(chatKey)
      if (saved) {
        try {
          const parsedMessages = JSON.parse(saved)
          console.log('Restored', parsedMessages.length, 'messages from session storage for existing workflow')
          return parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        } catch (e) {
          console.log('Failed to parse saved messages, starting fresh')
        }
      }
    }
    
    return [
      {
        id: '1',
        role: 'assistant',
        content: isNewWorkflow 
          ? `Welcome to WorkflowHub! I'm here to help you create a new workflow. 

I can generate complete, executable business workflow applications for processes like:
• Expense approval workflows
• Customer onboarding processes  
• Invoice processing systems
• Employee request workflows
• Document approval chains
• And many more!

Just describe the business process you want to automate, and I'll create a full working application with forms, logic, approvals, and notifications.

What workflow would you like me to create?`
          : `Welcome back! I'm here to help you modify and improve your workflow "${workflow.name || 'Untitled Workflow'}". 

You can ask me to:
• Add new steps to your workflow
• Modify existing steps
• Fix bugs or issues
• Change workflow settings
• Generate forms and validation logic
• Add integrations and notifications
• Optimize workflow performance

What would you like me to do with this workflow?`,
        timestamp: new Date()
      }
    ]
  })

  // Debug: Log when component mounts/remounts
  useEffect(() => {
    console.log('WorkflowChat component mounted/remounted')
    console.log('Current conversation length:', messages.length)
  }, [])

  // Save messages to sessionStorage whenever they change (but only for existing workflows)
  useEffect(() => {
    const isNewWorkflow = !workflow.id && (!workflow.config?.steps || workflow.config.steps.length === 0)
    
    if (typeof window !== 'undefined' && messages.length > 1) {
      const chatKey = `workflow-chat-${workflow.name || 'default'}`
      
      if (!isNewWorkflow) {
        // Save messages for established workflows
        sessionStorage.setItem(chatKey, JSON.stringify(messages))
        console.log('Saved', messages.length, 'messages to session storage for existing workflow')
      } else {
        // Check if workflow was just created (has steps now)
        const previouslyNew = sessionStorage.getItem(`${chatKey}_was_new`) === 'true'
        if (previouslyNew && workflow.config?.steps && workflow.config.steps.length > 0) {
          // Workflow was just created, start saving messages now
          sessionStorage.setItem(chatKey, JSON.stringify(messages))
          sessionStorage.removeItem(`${chatKey}_was_new`)
          console.log('Workflow established, now saving', messages.length, 'messages to session storage')
        } else if (!previouslyNew) {
          // Mark as new workflow
          sessionStorage.setItem(`${chatKey}_was_new`, 'true')
          console.log('Marked as new workflow, not saving messages yet')
        }
      }
    }
  }, [messages, workflow.name, workflow.id, workflow.config?.steps])
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false)
  const [generatedArtifact, setGeneratedArtifact] = useState<string>('')
  const [workflowFiles, setWorkflowFiles] = useState<{[key: string]: string}>({})
  
  // Handle files update to parent
  useEffect(() => {
    if (Object.keys(workflowFiles).length > 0) {
      console.log('🚀 UPDATING FILES: Triggering live preview refresh')
      onFilesUpdate(workflowFiles)
    }
  }, [workflowFiles, onFilesUpdate])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progressInfo, setProgressInfo] = useState<{
    step: string
    percentage: number
    startTime: number | null
    estimatedCompletion: number | null
  }>({
    step: '',
    percentage: 0,
    startTime: null,
    estimatedCompletion: null
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-scroll during streaming like Bolt.new
  useEffect(() => {
    if (isLoading) {
      const scrollInterval = setInterval(() => {
        scrollToBottom()
      }, 100) // Scroll every 100ms during generation
      
      return () => clearInterval(scrollInterval)
    }
  }, [isLoading])

  // Update timer display every second during loading
  useEffect(() => {
    if (isLoading && progressInfo.startTime) {
      const timerInterval = setInterval(() => {
        setProgressInfo(prev => ({ ...prev })) // Force re-render to update elapsed time display
      }, 1000)
      
      return () => clearInterval(timerInterval)
    }
  }, [isLoading, progressInfo.startTime])

  // Handle initial input from URL parameters - auto-start like Bolt.new
  useEffect(() => {
    if (initialInput && messages.length === 1) {
      const urlParams = new URLSearchParams(window.location.search);
      const autostart = urlParams.get('autostart') === 'true';
      
      console.log('🚀 AUTO-START: Initial input detected:', initialInput, 'Autostart:', autostart);
      
      // ALWAYS populate the input first
      setInput(initialInput);
      
      if (autostart) {
        // FIXED: Use requestAnimationFrame to ensure DOM is ready, then auto-submit
        requestAnimationFrame(() => {
          console.log('🔥 AUTO-SUBMITTING: Processing workflow request immediately...');
          
          // Call handleSubmit directly without synthetic event
          handleSubmitDirect();
        });
      }
    }
  }, [initialInput])

  const handleSubmitDirect = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(), // Display the clean user message without file modifications
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsGeneratingWorkflow(true)
    
    // Initialize progress tracking
    setProgressInfo({
      step: 'Starting generation',
      percentage: 0,
      startTime: Date.now(),
      estimatedCompletion: null
    })

    try {
      console.log('Sending workflow chat request...')
      console.log('Current conversation has', messages.length + 1, 'messages')
      
      // Check if user is asking about triggers
      let triggerQuestions: string[] = []
      let detectedTrigger: TriggerTemplate | undefined
      
      if (triggerMapper) {
        const triggerSuggestion = await triggerMapper.suggestTriggers(input.trim())
        
        if (triggerSuggestion.autoSelected) {
          detectedTrigger = triggerSuggestion.autoSelected
          console.log('Auto-selected trigger:', detectedTrigger.name)
          
          // Generate proactive questions for the AI to ask
          triggerQuestions = triggerMapper.generateProactiveQuestions(input.trim(), detectedTrigger)
          
          if (triggerQuestions.length > 0) {
            console.log('Generated trigger questions:', triggerQuestions)
          }
        }
      }
      
      // Rest of the submission logic...
      await processWorkflowRequest(input.trim(), triggerQuestions, detectedTrigger)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsGeneratingWorkflow(false)
      
      // Reset progress info
      setProgressInfo({
        step: '',
        percentage: 0,
        startTime: null,
        estimatedCompletion: null
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSubmitDirect()
  }

  // Process direct commands without AI
  const processDirectCommand = async (command: CommandResult, userInput: string) => {
    try {
      let responseMessage = ''
      
      if (command.type === 'component') {
        responseMessage = await handleComponentCommand(command, userInput)
      } else if (command.type === 'styling') {
        responseMessage = await handleStylingCommand(command, userInput)
      }
      
      // Add immediate response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseMessage,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      
      // Regenerate live preview from updated components
      if (command.type === 'component' || command.type === 'styling') {
        console.log('🔄 Regenerating code from updated component instances')
        const { html, css } = workflowComponentActions.regenerateWorkflowCode()
        onCodeUpdate(html)
        onFilesUpdate({ 'index.html': html, 'style.css': css })
      }
      
    } catch (error) {
      console.error('Error processing direct command:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing that command. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleComponentCommand = async (command: CommandResult, userInput: string): Promise<string> => {
    const { action, data } = command
    
    if (action === 'add') {
      const newComponent: ComponentInstance = {
        id: `comp-${Date.now()}`,
        workflowId: workflow.id || 'temp-workflow',
        componentId: data.componentId,
        stepType: 'capture',
        label: data.label,
        required: true,
        config: { type: data.type, placeholder: '' },
        validation: {},
        position: { step: 1, order: (workflowComponentActions.getComponentsForStep('capture').length + 1) },
        dataMapping: {},
        styling: {}
      }
      
      workflowComponentActions.addComponentInstance(newComponent)
      return `✅ Added "${data.label}" field to your workflow. You can see it in both the Live Preview and 4-Step Builder.`
    }
    
    if (action === 'update') {
      const targetField = data.target
      const instances = workflowComponentActions.getComponentsForStep('capture')
      const targetInstance = instances.find(inst => 
        inst.label.toLowerCase().includes(targetField) || 
        inst.config.type === targetField
      )
      
      if (targetInstance) {
        workflowComponentActions.updateComponentInstance(targetInstance.id, {
          [data.field]: data.value
        })
        return `✅ Updated "${targetInstance.label}" - made it ${data.value ? 'required' : 'optional'}.`
      } else {
        return `❌ Could not find a field matching "${targetField}". Please be more specific.`
      }
    }
    
    if (action === 'remove') {
      const targetField = data.target
      const instances = workflowComponentActions.getComponentsForStep('capture')
      const targetInstance = instances.find(inst => 
        inst.label.toLowerCase().includes(targetField)
      )
      
      if (targetInstance) {
        workflowComponentActions.removeComponentInstance(targetInstance.id)
        return `✅ Removed "${targetInstance.label}" field from your workflow.`
      } else {
        return `❌ Could not find a field matching "${targetField}". Please be more specific.`
      }
    }
    
    return 'Command processed.'
  }

  const handleStylingCommand = async (command: CommandResult, userInput: string): Promise<string> => {
    const { data } = command
    
    workflowComponentActions.updateWorkflowStyling(data)
    
    let message = '✅ Updated workflow styling:'
    if (data.theme?.primaryColor) message += ` Changed primary color to ${data.theme.primaryColor}.`
    if (data.theme?.backgroundColor) message += ` Changed background color.`
    if (data.theme?.fontSize) message += ` Updated font size.`
    if (data.buttons?.size) message += ` Made buttons ${data.buttons.size}.`
    
    return message + ' Check the Live Preview to see the changes!'
  }

  const processWorkflowRequest = async (userInput: string, triggerQuestions: string[], detectedTrigger?: TriggerTemplate) => {

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(), // Display the clean user message without file modifications
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsGeneratingWorkflow(true)
    
    // Initialize progress tracking
    setProgressInfo({
      step: 'Starting generation',
      percentage: 0,
      startTime: Date.now(),
      estimatedCompletion: null
    })

    try {
      console.log('Sending workflow chat request...')
      console.log('Current conversation has', messages.length + 1, 'messages')
      
      // FIRST: Check if this is a quick command that can be processed directly
      const command = parseUserCommand(userInput)
      console.log('🔍 Parsed command:', command)
      
      if (command.type !== 'none') {
        console.log('⚡ Processing direct command:', command.type, command.action)
        await processDirectCommand(command, userInput)
        return // Skip AI processing for direct commands
      }
      
      // Check if user is asking about triggers
      let triggerQuestions: string[] = []
      let detectedTrigger: TriggerTemplate | undefined
      
      if (triggerMapper) {
        const triggerSuggestion = await triggerMapper.suggestTriggers(input.trim())
        
        if (triggerSuggestion.autoSelected) {
          detectedTrigger = triggerSuggestion.autoSelected
          console.log('Auto-selected trigger:', detectedTrigger.name)
          
          // Generate proactive questions for the AI to ask
          triggerQuestions = triggerMapper.generateProactiveQuestions(input.trim(), detectedTrigger)
          
          if (triggerQuestions.length > 0) {
            console.log('Generated trigger questions:', triggerQuestions)
          }
        }
      }
      
      // Check if this is a modification request (not a new workflow creation)
      const isModificationRequest = messages.length > 1 && Object.keys(workflowFiles).length > 0
      let userMessageContent = input.trim()
      
      // Check if this is a step-specific request
      const stepKeywords = {
        'capture': ['capture', 'step 1', 'first step', 'data collection', 'form fields', 'input'],
        'review': ['review', 'step 2', 'second step', 'reviewer', 'validation'],
        'approval': ['approval', 'approve', 'step 3', 'third step', 'approver', 'sign off'],
        'update': ['update', 'step 4', 'fourth step', 'integration', 'system', 'automat']
      }
      
      let detectedStep = null
      const lowerInput = input.toLowerCase()
      
      for (const [step, keywords] of Object.entries(stepKeywords)) {
        if (keywords.some(keyword => lowerInput.includes(keyword))) {
          detectedStep = step
          break
        }
      }
      
      // If this is a modification request, include existing files in the message context
      if (isModificationRequest) {
        console.log('Including existing files for modification context:', Object.keys(workflowFiles))
        const fileModifications = Object.entries(workflowFiles)
          .map(([filePath, content]) => `<file path="${filePath}">\n${content}\n</file>`)
          .join('\n')
        
        // Prepend file context to user message
        userMessageContent = `<workflowhub_file_modifications>\n${fileModifications}\n</workflowhub_file_modifications>\n\n${input.trim()}`
      }
      
      const response = await fetch('/api/workflow-chat-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessageContent }
          ],
          triggerContext: {
            detectedTrigger,
            triggerQuestions
          },
          organizationId: organization?.id
        }),
      })

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`Failed to get response: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let assistantContent = ''
      let chunkCount = 0
      let accumulatedCleanContent = ''
      
      // Create streaming assistant message that updates in real-time like Bolt.new
      const streamingMessageId = (Date.now() + 1).toString()
      const streamingMessage: ChatMessage = {
        id: streamingMessageId,
        role: 'assistant',
        content: '🤖 Analyzing your request...',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, streamingMessage])
      
      // Stream the response and show real-time updates like Bolt.new
      console.log('Starting to read streaming response...')
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log(`Streaming complete. Received ${chunkCount} chunks.`)
          break
        }

        const text = new TextDecoder().decode(value)
        assistantContent += text
        chunkCount++
        
        // Clean and send real-time updates to code view - FORCE REFRESH
        const currentCleanContent = cleanStreamingResponse(assistantContent)
        if (currentCleanContent.length > accumulatedCleanContent.length) {
          accumulatedCleanContent = currentCleanContent
          // Send real-time update to code view AND force live preview refresh
          console.log('🔄 STREAMING UPDATE: Sending code update to preview', currentCleanContent.length, 'chars')
          onCodeUpdate(currentCleanContent)
        }
        
        // Always update streaming message with progress like Bolt.new (every few chunks)
        if (chunkCount % 5 === 0 || currentCleanContent.length > accumulatedCleanContent.length) {
          const progressMessage = extractProgressMessage(currentCleanContent, chunkCount)
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMessageId 
              ? { ...msg, content: progressMessage }
              : msg
          ))
        }
        
        // Log first few chunks to see what we're getting
        if (chunkCount <= 3) {
          console.log(`Chunk ${chunkCount}:`, text.substring(0, 100) + '...')
        }
      }

      // Store the full generated artifact
      setGeneratedArtifact(assistantContent)
      
      // Clean the chunked streaming format - extract actual content
      const cleanedContent = cleanStreamingResponse(assistantContent)
      console.log('Cleaned content length:', cleanedContent.length)
      console.log('Cleaned content preview:', cleanedContent.substring(0, 500) + '...')
      
      // Extract and persist files from the response - FORCE PREVIEW UPDATE
      const extractedFiles = extractFilesFromResponse(cleanedContent)
      if (Object.keys(extractedFiles).length > 0) {
        console.log('📁 EXTRACTED FILES:', Object.keys(extractedFiles))
        setWorkflowFiles(prev => ({ ...prev, ...extractedFiles }))
      }
      
      // Send the cleaned generated code to the parent - FORCE FINAL UPDATE
      console.log('📝 FINAL CODE UPDATE: Sending to preview', cleanedContent.length, 'chars')
      onCodeUpdate(cleanedContent)
      
      // Debug: Log the response to see what we're getting
      console.log('Full assistant response length:', assistantContent.length)
      
      if (cleanedContent.length === 0) {
        console.error('WARNING: Received empty response from API')
      }

      // Parse the response for workflow updates using cleaned content
      const workflowUpdated = parseWorkflowUpdates(cleanedContent)

      // Create component instances from user request
      if (organization?.id && !isModificationRequest) {
        try {
          const componentInstances = await createComponentInstancesFromRequest(
            userInput, 
            organization.id, 
            workflow.id || 'temp-workflow-id',
            onWorkflowUpdate
          )
          
          // Store component instances in shared store for both views
          const allComponents = Object.values(componentInstances).flat() as ComponentInstance[]
          workflowComponentActions.setComponentInstances(allComponents)
          console.log('💾 Component instances stored in shared store:', allComponents.length)
          
        } catch (error) {
          console.error('Component instance creation failed:', error)
          // Continue without component instances if tables don't exist
        }
      }

      // Show completion progress
      setProgressInfo(prev => ({
        ...prev,
        step: 'Workflow complete!',
        percentage: 100
      }))
      
      // Extract the conversational AI response from the cleaned content
      const finalMessage = extractConversationalResponse(cleanedContent)
      
      // Update the streaming message with the AI's conversational response
      setMessages(prev => prev.map(msg => 
        msg.id === streamingMessageId 
          ? { ...msg, content: finalMessage }
          : msg
      ))

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsGeneratingWorkflow(false)
      
      // Reset progress info
      setProgressInfo({
        step: '',
        percentage: 0,
        startTime: null,
        estimatedCompletion: null
      })
    }
  }

  const extractConversationalResponse = (content: string): string => {
    try {
      // Look for the AI's conversational response outside of artifact tags
      // The AI's response is usually after the </boltArtifact> tag
      const afterArtifact = content.split('</boltArtifact>')[1];
      
      if (afterArtifact && afterArtifact.trim().length > 0) {
        // Clean up the response - remove any extra whitespace and formatting
        const conversationalResponse = afterArtifact
          .trim()
          .replace(/^\n+/, '') // Remove leading newlines
          .replace(/\n+$/, '') // Remove trailing newlines
          .replace(/\n\s*\n/g, '\n\n'); // Normalize paragraph spacing
        
        if (conversationalResponse.length > 50) {
          console.log('Found conversational response:', conversationalResponse.substring(0, 200) + '...');
          return conversationalResponse;
        }
      }
      
      // Fallback to smart summary if no conversational response found
      return createSmartWorkflowSummary(content);
      
    } catch (error) {
      console.error('Error extracting conversational response:', error);
      return createSmartWorkflowSummary(content);
    }
  };

  const createSmartWorkflowSummary = (content: string): string => {
    // Check if this appears to be a workflow generation response
    const hasWorkflowArtifact = content.includes('<boltArtifact') && content.includes('</boltArtifact>');
    
    if (hasWorkflowArtifact) {
      // Extract workflow name from content
      const packageMatch = content.match(/"name":\s*"([^"]+)"/);
      const workflowName = packageMatch ? packageMatch[1] : 'Your Workflow';
      
      // Count features generated
      const features = [];
      if (content.includes('package.json')) features.push('✅ Project configuration and dependencies');
      if (content.includes('server.js')) features.push('✅ Backend server with Express.js');
      if (content.includes('form') || content.includes('html')) features.push('✅ Professional user interfaces');
      if (content.includes('email') || content.includes('nodemailer')) features.push('✅ Email notification system');
      if (content.includes('database') || content.includes('sqlite')) features.push('✅ Database schema and operations');
      if (content.includes('upload') || content.includes('multer')) features.push('✅ File upload handling');
      if (content.includes('css') || content.includes('style')) features.push('✅ Professional styling');
      
      return `🎉 **I've successfully created your workflow application!**

**"${workflowName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}"**

Here's what I've built for you:

${features.length > 0 ? features.join('\n') : '✅ Complete workflow application structure'}

**The application includes:**
• Complete working forms for data collection
• Automated business logic and routing
• Professional user interface with responsive design
• Email notifications for all stakeholders
• Database operations for data persistence
• Real-time dashboard for monitoring

**You can now:**
• **💾 Save** the workflow as a draft for later
• **🚀 Deploy** it to make it live and functional
• **✏️ Ask me to modify** any aspect of the workflow
• **🧪 Test** it once deployed to see it in action

The workflow is visible in the live preview on the right. What would you like me to adjust or add to make it perfect for your needs?`;
    } else {
      return `I'm processing your request and generating the workflow application. The complete implementation will be ready shortly with all the functionality you requested.`;
    }
  };

  const extractProgressMessage = (cleanedContent: string, chunkCount: number): string => {
    let step = ''
    let percentage = 0
    let message = ''

    // Better progress calculation based on content and time
    const contentLength = cleanedContent.length
    
    // More realistic progress steps based on content milestones
    if (contentLength < 100) {
      step = 'Analyzing requirements'
      percentage = 5
      message = '🤖 Analyzing your workflow requirements and getting started...'
    } else if (cleanedContent.includes('package.json') && !cleanedContent.includes('server.js')) {
      step = 'Setting up project foundation'
      percentage = 15
      message = `📦 Setting up the project foundation with all the dependencies your workflow needs...`
    } else if (cleanedContent.includes('server.js') && !cleanedContent.includes('views/') && !cleanedContent.includes('.html')) {
      step = 'Building backend server'
      percentage = 35
      message = `⚙️ Building the backend server that will handle your workflow logic and data processing...`
    } else if ((cleanedContent.includes('views/') || cleanedContent.includes('.html')) && !cleanedContent.includes('css') && !cleanedContent.includes('style')) {
      step = 'Creating user interfaces'
      percentage = 55
      message = `🎨 Creating beautiful, professional forms and user interfaces for your workflow...`
    } else if ((cleanedContent.includes('css') || cleanedContent.includes('style')) && !cleanedContent.includes('boltArtifact')) {
      step = 'Adding professional styling'
      percentage = 75
      message = `💅 Adding professional styling to make your workflow look polished and user-friendly...`
    } else if (cleanedContent.includes('boltArtifact')) {
      step = 'Finalizing workflow'
      percentage = 95
      message = `✨ Putting the finishing touches on your workflow application - almost ready!`
    } else {
      // Progressive content-based calculation for unknown stages
      const basePercentage = 20
      const contentProgress = Math.min(Math.floor(contentLength / 2000) * 15, 70)
      percentage = Math.min(basePercentage + contentProgress, 90)
      step = 'Generating workflow application'
      message = `🔄 Generating your complete workflow application with all the features you requested...`
    }

    // Update progress state with better time calculation
    setProgressInfo(prev => {
      const now = Date.now()
      const startTime = prev.startTime || now
      const elapsed = now - startTime
      
      // Only show estimated completion if we have meaningful progress and reasonable time
      let estimatedCompletion = null
      
      // Don't show estimates if stuck at low percentage for too long
      const timePerPercentage = elapsed / percentage
      if (percentage > prev.percentage && timePerPercentage < 5000) { // Progress is moving and reasonable
        const remainingPercentage = 100 - percentage
        const estimatedRemaining = remainingPercentage * timePerPercentage
        estimatedCompletion = now + estimatedRemaining
      }

      return {
        step,
        percentage: Math.max(percentage, prev.percentage), // Never go backwards
        startTime,
        estimatedCompletion
      }
    })
    
    return message
  }

  const extractFilesFromResponse = (content: string): {[key: string]: string} => {
    const files: {[key: string]: string} = {}
    
    try {
      // Extract boltAction file operations
      const fileMatches = Array.from(content.matchAll(/<boltAction[^>]*type="file"[^>]*filePath="([^"]*)"[^>]*>([\s\S]*?)<\/boltAction>/g))
      
      for (const match of fileMatches) {
        const filePath = match[1]
        const fileContent = match[2].trim()
        files[filePath] = fileContent
        console.log(`Extracted file: ${filePath} (${fileContent.length} chars)`)
      }
    } catch (error) {
      console.error('Error extracting files:', error)
    }
    
    return files
  }

  const cleanStreamingResponse = (streamContent: string): string => {
    try {
      // The streaming response comes in format: 0:"content"
      // We need to extract just the content parts and join them
      const chunks = streamContent.split('\n')
      let cleanedContent = ''
      
      for (const chunk of chunks) {
        // Look for chunks in format: 0:"content"
        const match = chunk.match(/^\d+:"([\s\S]*)"$/)
        if (match) {
          // Unescape the JSON string content
          const content = match[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
          cleanedContent += content
        }
      }
      
      return cleanedContent
    } catch (error) {
      console.error('Error cleaning streaming response:', error)
      return streamContent // Return original if cleaning fails
    }
  }

  const parseWorkflowUpdates = (content: string): boolean => {
    // Look for workflow updates in the assistant's response
    // This would parse the generated code and extract workflow modifications
    try {
      console.log('Parsing workflow updates from content...')
      
      // First try to find boltArtifact tags
      const artifactMatch = content.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/)
      
      if (artifactMatch) {
        console.log('Found boltArtifact in response')
        console.log('Artifact content length:', artifactMatch[1].length)
        const artifactContent = artifactMatch[1]
        
        // Log first part of artifact content to see structure
        console.log('Artifact content preview:', artifactContent.substring(0, 300))
        
        // Extract workflow name from artifact title or package.json
        const titleMatch = content.match(/<boltArtifact[^>]*title="([^"]*)"/)
        const workflowTitle = titleMatch ? titleMatch[1] : 'Generated Workflow'
        console.log('Workflow title:', workflowTitle)
        
        // Look for package.json to identify workflow type
        const packageMatch = artifactContent.match(/<boltAction[^>]*filePath="package\.json"[^>]*>([\s\S]*?)<\/boltAction>/)
        if (packageMatch) {
          console.log('Found package.json in artifact')
          try {
            const packageContent = packageMatch[1]
            console.log('Package.json content preview:', packageContent.substring(0, 200))
            const packageJson = JSON.parse(packageContent)
            console.log('Parsed package.json:', packageJson.name)
            
            // Update workflow name and description based on package.json
            if (packageJson.name && packageJson.description) {
              const updatedWorkflow = {
                ...workflow,
                name: packageJson.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                description: packageJson.description
              }
              setTimeout(() => onWorkflowUpdate(updatedWorkflow), 0)
            }
          } catch (e) {
            console.error('Could not parse package.json from response:', e)
          }
        } else {
          console.log('No package.json found in artifact')
        }

        // Look for server.js or main application file to extract workflow steps
        const serverMatch = artifactContent.match(/<boltAction[^>]*filePath="server\.js"[^>]*>([\s\S]*?)<\/boltAction>/)
        if (serverMatch) {
          console.log('Found server.js in artifact')
          console.log('Server.js content length:', serverMatch[1].length)
          // Extract workflow logic and convert to steps
          const serverContent = serverMatch[1]
          console.log('Server content preview:', serverContent.substring(0, 300))
          const extractedSteps = extractWorkflowStepsFromCode(serverContent)
          
          console.log(`Extracted ${extractedSteps.length} steps from server code:`)
          extractedSteps.forEach((step, index) => {
            console.log(`  Step ${index + 1}: ${step.name} (${step.type})`)
          })
          
          if (extractedSteps.length > 0) {
            const updatedWorkflow = {
              ...workflow,
              config: {
                ...workflow.config,
                steps: extractedSteps,
                triggers: workflow.config?.triggers || [],
                settings: workflow.config?.settings || {
                  notificationChannels: [],
                  errorHandling: 'stop',
                  maxRetries: 3,
                  timeoutMinutes: 60
                }
              }
            }
            console.log('Updating workflow with extracted steps')
            setTimeout(() => onWorkflowUpdate(updatedWorkflow), 0)
            return true
          } else {
            console.log('No steps extracted from server code')
          }
        } else {
          console.log('No server.js found in artifact')
          // Let's look for any boltAction files
          const allActions = artifactContent.match(/<boltAction[^>]*filePath="([^"]*)"[^>]*>/g)
          if (allActions) {
            console.log('Available boltAction files:', allActions.map(action => {
              const fileMatch = action.match(/filePath="([^"]*)"/)
              return fileMatch ? fileMatch[1] : 'unknown'
            }))
          }
        }
        
        // Even if we didn't extract steps, we found an artifact
        return true
      } else {
        console.log('No boltArtifact found in response')
        
        // Try to detect if workflow was discussed even without artifact tags
        const workflowKeywords = ['workflow', 'process', 'steps', 'automation', 'generated', 'created']
        const hasWorkflowContent = workflowKeywords.some(keyword => 
          content.toLowerCase().includes(keyword)
        )
        
        if (hasWorkflowContent) {
          console.log('Response contains workflow-related content')
          // Create a basic workflow structure
          const basicSteps: WorkflowStep[] = [
            {
              id: 'step-1',
              name: 'Workflow Initialized',
              type: 'capture',
              description: 'Workflow structure created from chat',
              config: {},
              nextSteps: []
            }
          ]
          
          const updatedWorkflow = {
            ...workflow,
            config: {
              ...workflow.config,
              steps: basicSteps,
              triggers: workflow.config?.triggers || [],
              settings: workflow.config?.settings || {
                notificationChannels: [],
                errorHandling: 'stop',
                maxRetries: 3,
                timeoutMinutes: 60
              }
            }
          }
          setTimeout(() => onWorkflowUpdate(updatedWorkflow), 0)
          return true
        }
      }
      
      return false
    } catch (error) {
      console.log('Could not parse workflow updates from response:', error)
      return false
    }
  }

  const extractWorkflowStepsFromCode = (serverCode: string): WorkflowStep[] => {
    const steps: WorkflowStep[] = []
    
    console.log('Extracting workflow steps from server code...')
    
    // Extract steps based on common patterns in generated workflow code
    
    // Look for form submission endpoints (capture steps)
    const submitMatches = serverCode.match(/app\.post\(['"`]([^'"`]*submit[^'"`]*)/g)
    if (submitMatches && submitMatches.length > 0) {
      console.log('Found submission endpoint, adding capture step')
      steps.push({
        id: `step-${steps.length + 1}`,
        name: 'Expense Submission',
        type: 'capture',
        description: 'Employees submit expense reports with receipts',
        config: {
          form: {
            fields: extractFormFields(serverCode)
          }
        },
        nextSteps: []
      })
    }

    // Look for approval logic (approval steps)
    if (serverCode.includes('approval') || serverCode.includes('approve') || serverCode.includes('manager')) {
      console.log('Found approval logic, adding approval step')
      steps.push({
        id: `step-${steps.length + 1}`,
        name: 'Manager Approval',
        type: 'approve',
        description: 'Manager reviews and approves/rejects expenses over $500',
        config: {
          approvers: ['manager'],
          autoApprove: { enabled: true, threshold: 500 },
          conditions: {
            amountThreshold: 500,
            autoApproveUnder: true
          }
        },
        nextSteps: []
      })
    }

    // Look for email functionality (notification steps)
    if (serverCode.includes('nodemailer') || serverCode.includes('sendMail') || serverCode.includes('email')) {
      console.log('Found email functionality, adding notification step')
      steps.push({
        id: `step-${steps.length + 1}`,
        name: 'Email Notifications',
        type: 'update',
        description: 'Send notifications to employees and managers',
        config: {
          email: {
            template: 'expense_notification',
            recipients: ['submitter', 'manager'],
            triggers: ['submission', 'approval', 'rejection']
          }
        },
        nextSteps: []
      })
    }

    // Look for database operations (integration steps)
    if (serverCode.includes('INSERT') || serverCode.includes('expense_reports') || serverCode.includes('database')) {
      console.log('Found database operations, adding storage step')
      steps.push({
        id: `step-${steps.length + 1}`,
        name: 'Data Storage',
        type: 'update',
        description: 'Store expense data and maintain audit trail',
        config: {
          database: {
            operation: 'insert',
            table: 'expense_reports',
            auditTrail: true
          }
        },
        nextSteps: []
      })
    }

    // Look for file upload functionality
    if (serverCode.includes('multer') || serverCode.includes('upload') || serverCode.includes('receipt')) {
      console.log('Found file upload functionality, adding upload step')
      steps.push({
        id: `step-${steps.length + 1}`,
        name: 'Receipt Upload',
        type: 'capture',
        description: 'Handle receipt image and document uploads',
        config: {
          fileUpload: {
            acceptedTypes: ['image/*', '.pdf'],
            maxSize: '10MB',
            storage: 'uploads'
          }
        },
        nextSteps: []
      })
    }

    console.log(`Extracted ${steps.length} workflow steps`)
    return steps
  }

  const extractFormFields = (serverCode: string): any[] => {
    const fields: any[] = []
    
    console.log('Extracting form fields from server code...')
    
    // Extract fields from req.body destructuring or form parsing
    const patterns = [
      // Look for const { field1, field2 } = req.body;
      /const\s*{\s*([^}]+)\s*}\s*=\s*req\.body/g,
      // Look for req.body.fieldName
      /req\.body\.(\w+)/g,
      // Look for HTML input names
      /name=["'](\w+)["']/g
    ]
    
    const foundFields = new Set<string>()
    
    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(serverCode)) !== null) {
        if (match[1]) {
          // Handle destructuring (might have multiple fields)
          if (match[0].includes('{')) {
            const fieldsInMatch = match[1].split(',').map(f => f.trim())
            fieldsInMatch.forEach(field => {
              if (field && !field.includes('...') && field.length > 0) {
                foundFields.add(field.toLowerCase())
              }
            })
          } else {
            // Single field
            foundFields.add(match[1].toLowerCase())
          }
        }
      }
    })
    
    // Convert found fields to proper format
    Array.from(foundFields).forEach(fieldName => {
      if (fieldName && fieldName !== 'body') {
        console.log(`Found field: ${fieldName}`)
        
        // Determine field type based on name
        let type = 'text'
        if (fieldName.includes('email')) type = 'email'
        else if (fieldName.includes('amount') || fieldName.includes('price') || fieldName.includes('cost')) type = 'number'
        else if (fieldName.includes('date')) type = 'date'
        else if (fieldName.includes('file') || fieldName.includes('upload') || fieldName.includes('receipt')) type = 'file'
        else if (fieldName.includes('category') || fieldName.includes('type') || fieldName.includes('status')) type = 'dropdown'
        
        // Create nice label from field name
        const label = fieldName.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        fields.push({
          name: fieldName,
          type: type,
          required: true,
          label: label,
          validation: type === 'email' ? { format: 'email' } : 
                     type === 'number' ? { min: 0, step: 0.01 } : 
                     type === 'file' ? { accept: 'image/*,.pdf' } : {}
        })
      }
    })

    // If no specific fields found, add generic form fields
    if (fields.length === 0) {
      console.log('No specific fields found, adding default form fields')
      fields.push(
        { name: 'name', type: 'text', required: true, label: 'Name', validation: {} },
        { name: 'email', type: 'email', required: true, label: 'Email', validation: { format: 'email' } },
        { name: 'message', type: 'text', required: true, label: 'Message', validation: {} }
      )
    }

    console.log(`Extracted ${fields.length} form fields`)
    return fields
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      {/* Messages Section - Similar to original Bolt.new */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col w-full max-w-chat px-4 pb-6 mx-auto">
          {messages.map((message, index) => {
            const isUserMessage = message.role === 'user'
            const isFirst = index === 0
            const isLast = index === messages.length - 1

            return (
              <div
                key={message.id}
                className={`flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)] ${
                  isUserMessage || !isLoading || (isLoading && !isLast)
                    ? 'bg-bolt-elements-messages-background'
                    : 'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent'
                } ${!isFirst ? 'mt-4' : ''}`}
              >
                {isUserMessage && (
                  <div className="flex items-center justify-center w-[34px] h-[34px] overflow-hidden bg-white text-gray-600 rounded-full shrink-0 self-start">
                    <div className="i-ph:user-fill text-xl"></div>
                  </div>
                )}
                <div className="grid grid-col-1 w-full">
                  {isUserMessage ? (
                    <div className="overflow-hidden w-full">
                      <div className="prose text-bolt-elements-textPrimary max-w-none whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden w-full">
                      <div className="prose text-bolt-elements-textPrimary max-w-none whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          {isLoading && (
            <div className="flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)] bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent mt-4">
              <div className="flex items-center justify-center w-[34px] h-[34px] overflow-hidden bg-bolt-elements-prompt-background text-bolt-elements-textPrimary rounded-full shrink-0 self-start">
                <div className="i-ph:robot text-xl"></div>
              </div>
              <div className="grid grid-col-1 w-full">
                <div className="overflow-hidden w-full">
                  <div className="space-y-4">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="i-svg-spinners:3-dots-fade text-xl text-bolt-elements-textSecondary"></div>
                        <span className="text-bolt-elements-textPrimary font-medium">
                          {progressInfo.step || 'Processing...'}
                        </span>
                      </div>
                      {progressInfo.startTime && (
                        <div className="text-sm text-bolt-elements-textSecondary">
                          {Math.floor((Date.now() - progressInfo.startTime) / 1000)}s elapsed
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-bolt-elements-surface-secondary rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progressInfo.percentage}%` }}
                      />
                    </div>
                    
                    {/* Progress Details */}
                    <div className="flex items-center justify-between text-sm text-bolt-elements-textSecondary">
                      <span>{progressInfo.percentage}% complete</span>
                      {progressInfo.estimatedCompletion ? (
                        <span>
                          ~{Math.max(0, Math.ceil((progressInfo.estimatedCompletion - Date.now()) / 1000))}s remaining
                        </span>
                      ) : progressInfo.startTime && (Date.now() - progressInfo.startTime) > 10000 ? (
                        <span>Processing...</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Section - Match original Bolt.new styling */}
      <div className="relative w-full max-w-chat mx-auto z-prompt px-4 pb-6">
        <div className="shadow-sm border border-bolt-elements-borderColor bg-bolt-elements-prompt-background backdrop-filter backdrop-blur-[8px] rounded-lg overflow-hidden">
          <textarea
            ref={inputRef}
            className="w-full pl-4 pt-4 pr-16 focus:outline-none resize-none text-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent"
            onKeyDown={handleKeyDown}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              minHeight: 76,
              maxHeight: 400,
            }}
            placeholder="How can I help you with this workflow?"
            translate="no"
            disabled={isLoading}
          />
          
          {/* Send Button */}
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={!input.trim() || isLoading}
            className={`absolute top-[18px] right-[18px] p-[6px] rounded-md transition-all ${
              input.trim() && !isLoading
                ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text hover:bg-bolt-elements-button-primary-backgroundHover'
                : 'bg-bolt-elements-button-secondary-background text-bolt-elements-button-secondary-text cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl"></div>
            ) : (
              <div className="i-ph:paper-plane-tilt-fill text-xl"></div>
            )}
          </button>
          
          <div className="flex justify-between text-sm p-4 pt-2">
            <div className="flex gap-1 items-center">
              {/* Placeholder for enhance button - can add later */}
            </div>
            {input.length > 3 ? (
              <div className="text-xs text-bolt-elements-textTertiary">
                Use <kbd className="kdb">Shift</kbd> + <kbd className="kdb">Return</kbd> for a new line
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}