import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '~/components/auth/AuthProvider'
import type { Workflow, WorkflowStep } from '~/types/database'

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
}

export function WorkflowChat({ workflow, onWorkflowUpdate, onCodeUpdate, onFilesUpdate, initialInput, forceFresh = false }: WorkflowChatProps) {
  const { user } = useAuth()
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
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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

  // Handle initial input from URL parameters
  useEffect(() => {
    if (initialInput && messages.length === 1) {
      // Automatically send the initial input as the first user message
      setInput(initialInput)
      // Use a small delay to ensure the component is fully rendered
      setTimeout(() => {
        const form = document.querySelector('form')
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        }
      }, 500)
    }
  }, [initialInput, messages.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    try {
      console.log('Sending workflow chat request...')
      console.log('Current conversation has', messages.length + 1, 'messages')
      
      // Check if this is a modification request (not a new workflow creation)
      const isModificationRequest = messages.length > 1 && Object.keys(workflowFiles).length > 0
      let userMessageContent = input.trim()
      
      // If this is a modification request, include existing files in the message context
      if (isModificationRequest) {
        console.log('Including existing files for modification context:', Object.keys(workflowFiles))
        const fileModifications = Object.entries(workflowFiles)
          .map(([filePath, content]) => `<file path="${filePath}">\n${content}\n</file>`)
          .join('\n')
        
        // Prepend file context to user message
        userMessageContent = `<workflowhub_file_modifications>\n${fileModifications}\n</workflowhub_file_modifications>\n\n${input.trim()}`
      }
      
      const response = await fetch('/api/workflow-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessageContent }
          ]
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
        
        // Clean and send real-time updates to code view
        const currentCleanContent = cleanStreamingResponse(assistantContent)
        if (currentCleanContent.length > accumulatedCleanContent.length) {
          accumulatedCleanContent = currentCleanContent
          // Send real-time update to code view
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
      
      // Extract and persist files from the response
      const extractedFiles = extractFilesFromResponse(cleanedContent)
      if (Object.keys(extractedFiles).length > 0) {
        console.log('Extracted files:', Object.keys(extractedFiles))
        setWorkflowFiles(prev => {
          const updatedFiles = { ...prev, ...extractedFiles }
          onFilesUpdate(updatedFiles)
          return updatedFiles
        })
      }
      
      // Send the cleaned generated code to the parent
      onCodeUpdate(cleanedContent)
      
      // Debug: Log the response to see what we're getting
      console.log('Full assistant response length:', assistantContent.length)
      
      if (cleanedContent.length === 0) {
        console.error('WARNING: Received empty response from API')
      }

      // Parse the response for workflow updates using cleaned content
      const workflowUpdated = parseWorkflowUpdates(cleanedContent)

      // Create a user-friendly summary message instead of showing raw code
      const summaryMessage = createWorkflowSummary(assistantContent, workflowUpdated)
      
      // Update the streaming message with the final summary
      setMessages(prev => prev.map(msg => 
        msg.id === streamingMessageId 
          ? { ...msg, content: summaryMessage }
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
    }
  }

  const createWorkflowSummary = (content: string, workflowUpdated: boolean): string => {
    if (workflowUpdated) {
      // Extract workflow name from content
      const packageMatch = content.match(/"name":\s*"([^"]+)"/);
      const workflowName = packageMatch ? packageMatch[1] : 'Your Workflow';
      
      // Count actual workflow steps from current state
      const currentSteps = workflow.config?.steps || [];
      const stepCount = currentSteps.length;
      
      // Count features generated
      const features = [];
      if (content.includes('package.json')) features.push('✅ Project configuration');
      if (content.includes('server.js')) features.push('✅ Backend server');
      if (content.includes('form') || content.includes('html')) features.push('✅ User interfaces');
      if (content.includes('email') || content.includes('nodemailer')) features.push('✅ Email notifications');
      if (content.includes('database') || content.includes('sqlite')) features.push('✅ Database schema');
      if (content.includes('upload') || content.includes('multer')) features.push('✅ File upload handling');
      
      // Generate step summary
      const stepSummary = currentSteps.length > 0 ? 
        currentSteps.map(step => `• **${step.name}**: ${step.description}`).join('\n') :
        '• Basic workflow structure created';
      
      return `🎉 **Workflow Generated Successfully!**

**"${workflowName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}"**

I've created a complete, executable workflow application with **${stepCount} workflow steps**:

${stepSummary}

**Generated Components:**
${features.join('\n')}

The workflow is now visible in the canvas on the right. You can:
• **Save** the workflow as a draft
• **Deploy** it to make it live
• **Modify** it by asking me to make changes
• **Test** it once deployed

What would you like to do next?`;
    } else {
      return `I'm working on processing your request. The workflow structure will be updated momentarily. Please let me know if you'd like me to make any specific changes or additions.`;
    }
  };

  const extractProgressMessage = (cleanedContent: string, chunkCount: number): string => {
    // Extract what's being built from the AI response like Bolt.new
    if (cleanedContent.length < 100) {
      return '🤖 Starting workflow generation...'
    }

    // Look for key indicators of what's being built
    if (cleanedContent.includes('package.json')) {
      return `📦 Setting up project structure... (${chunkCount} chunks processed)`
    }
    
    if (cleanedContent.includes('server.js')) {
      return `⚙️ Building backend server logic... (${chunkCount} chunks processed)`
    }
    
    if (cleanedContent.includes('views/') || cleanedContent.includes('.html')) {
      return `🎨 Creating user interface forms... (${chunkCount} chunks processed)`
    }
    
    if (cleanedContent.includes('nodemailer') || cleanedContent.includes('email')) {
      return `📧 Configuring email notifications... (${chunkCount} chunks processed)`
    }
    
    if (cleanedContent.includes('database') || cleanedContent.includes('sqlite')) {
      return `🗄️ Setting up database schema... (${chunkCount} chunks processed)`
    }
    
    if (cleanedContent.includes('css') || cleanedContent.includes('style')) {
      return `💅 Styling the application... (${chunkCount} chunks processed)`
    }
    
    if (cleanedContent.includes('boltArtifact')) {
      return `✨ Finalizing workflow application... (${chunkCount} chunks processed)`
    }
    
    // Default progress message
    return `🔄 Generating workflow code... (${chunkCount} chunks processed)`
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
    
    // Look for common form field patterns in the expense workflow
    const fieldPatterns = [
      { name: 'employee_name', type: 'text', pattern: /employee_name/i, label: 'Employee Name' },
      { name: 'employee_email', type: 'email', pattern: /employee_email/i, label: 'Employee Email' },
      { name: 'amount', type: 'number', pattern: /amount.*parseFloat|amount.*number/i, label: 'Amount ($)' },
      { name: 'category', type: 'select', pattern: /category.*select|category.*option/i, label: 'Expense Category' },
      { name: 'description', type: 'textarea', pattern: /description.*textarea|description.*text/i, label: 'Description' },
      { name: 'manager_email', type: 'email', pattern: /manager_email/i, label: 'Manager Email' },
      { name: 'receipt', type: 'file', pattern: /receipt.*upload|multer.*receipt/i, label: 'Receipt Upload' }
    ]

    fieldPatterns.forEach(field => {
      if (field.pattern.test(serverCode)) {
        console.log(`Found field: ${field.name}`)
        fields.push({
          name: field.name,
          type: field.type,
          required: true,
          label: field.label,
          validation: field.type === 'email' ? { format: 'email' } : 
                     field.type === 'number' ? { min: 0, step: 0.01 } : 
                     field.type === 'file' ? { accept: 'image/*,.pdf' } : {}
        })
      }
    })

    // If no specific fields found, add generic expense fields
    if (fields.length === 0) {
      console.log('No specific fields found, adding default expense fields')
      fields.push(
        { name: 'amount', type: 'number', required: true, label: 'Amount ($)', validation: { min: 0, step: 0.01 } },
        { name: 'description', type: 'textarea', required: true, label: 'Description' },
        { name: 'category', type: 'select', required: true, label: 'Category' }
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
            <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
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