// AI Trigger Mapping Intelligence
// Maps natural language to appropriate workflow triggers and asks proactive questions

import type {
  TriggerTemplate,
  TriggerSuggestion,
  TriggerConversation,
  TriggerSetupQuestion,
  TriggerConfig,
  WorkflowTrigger
} from '~/types/trigger-library'

export class TriggerMapper {
  private triggers: TriggerTemplate[] = []
  private initialized = false

  constructor(private organizationId: string) {}

  async initialize() {
    if (this.initialized) return
    
    try {
      const response = await fetch(`/api/trigger-library?organization_id=${this.organizationId}&active=true`)
      const data = await response.json()
      this.triggers = data.triggers || []
      this.initialized = true
      console.log(`Initialized TriggerMapper with ${this.triggers.length} active triggers`)
    } catch (error) {
      console.error('Failed to initialize TriggerMapper:', error)
      this.triggers = this.getDefaultTriggers()
      this.initialized = true
    }
  }

  /**
   * Analyzes user input and suggests appropriate triggers
   */
  async suggestTriggers(userInput: string): Promise<TriggerSuggestion> {
    await this.initialize()
    
    const detectedIntent = this.detectTriggerIntent(userInput)
    const matches = this.findTriggerMatches(userInput)
    const autoSelected = this.selectBestTrigger(matches)
    
    console.log(`Trigger suggestion for "${userInput}":`)
    console.log(`- Detected intent: ${detectedIntent}`)
    console.log(`- Found ${matches.length} matches`)
    console.log(`- Auto-selected: ${autoSelected?.name || 'None'}`)
    
    return {
      userInput,
      detectedIntent,
      suggestedTriggers: matches,
      autoSelected
    }
  }

  /**
   * Creates a conversation flow for trigger configuration
   */
  async startTriggerConversation(
    workflowId: string, 
    triggerTemplate: TriggerTemplate,
    userInput: string
  ): Promise<TriggerConversation> {
    const conversation: TriggerConversation = {
      workflowId,
      currentTemplate: triggerTemplate,
      answeredQuestions: {},
      remainingQuestions: [...triggerTemplate.setupQuestions],
      isComplete: false
    }

    // Try to pre-populate answers from user input
    this.extractAnswersFromInput(userInput, conversation)

    return conversation
  }

  /**
   * Processes an answer to a setup question
   */
  answerQuestion(
    conversation: TriggerConversation, 
    questionId: string, 
    answer: any
  ): TriggerConversation {
    const question = conversation.remainingQuestions.find(q => q.id === questionId)
    if (!question) {
      throw new Error('Question not found')
    }

    // Validate answer
    if (question.required && (answer === undefined || answer === null || answer === '')) {
      throw new Error('This question requires an answer')
    }

    // Store answer
    conversation.answeredQuestions[questionId] = answer

    // Remove from remaining questions
    conversation.remainingQuestions = conversation.remainingQuestions.filter(q => q.id !== questionId)

    // Check if we have dependencies to add
    const dependentQuestions = conversation.currentTemplate!.setupQuestions.filter(q => 
      q.dependsOn === question.configMapping && q.dependsOnValue === answer
    )

    // Add dependent questions if they haven't been added yet
    dependentQuestions.forEach(depQ => {
      if (!conversation.remainingQuestions.find(q => q.id === depQ.id) && 
          !conversation.answeredQuestions.hasOwnProperty(depQ.id)) {
        conversation.remainingQuestions.push(depQ)
      }
    })

    // Check if conversation is complete
    conversation.isComplete = conversation.remainingQuestions.length === 0

    // Generate config if complete
    if (conversation.isComplete) {
      conversation.generatedConfig = this.generateTriggerConfig(conversation)
    }

    return conversation
  }

  /**
   * Generates proactive questions for the AI to ask
   */
  generateProactiveQuestions(userInput: string, triggerTemplate: TriggerTemplate): string[] {
    const questions: string[] = []
    
    // Check what information we can extract vs what we need
    const extractedInfo = this.extractConfigFromInput(userInput, triggerTemplate)
    
    for (const setupQuestion of triggerTemplate.setupQuestions) {
      const hasAnswer = extractedInfo.hasOwnProperty(setupQuestion.configMapping)
      
      if (!hasAnswer) {
        // Generate natural language question for the AI to ask
        questions.push(this.generateNaturalQuestion(setupQuestion, userInput))
      }
    }

    return questions
  }

  /**
   * Converts technical setup questions to natural language
   */
  private generateNaturalQuestion(question: TriggerSetupQuestion, context: string): string {
    const templates = {
      'email.mailbox': 'Which email address should I monitor for incoming emails?',
      'email.provider': 'What email provider are you using (Gmail, Outlook, Exchange)?',
      'email.fromFilter': 'Should I only monitor emails from specific senders? If so, which ones?',
      'email.subjectFilter': 'Should I only look for emails with specific subject keywords?',
      'scheduled.type': 'How often should this workflow run? (daily, weekly, monthly, or custom schedule)',
      'scheduled.time': 'What time should this run? (e.g., 9:00 AM)',
      'scheduled.dayOfWeek': 'Which day of the week? (Monday=1, Sunday=7)',
      'file.platform': 'Which file storage platform? (SharePoint, Google Drive, Dropbox, OneDrive)',
      'file.folder': 'Which folder should I monitor for new files?',
      'file.filePattern': 'Should I only watch for specific file types? (e.g., .pdf, .docx)',
      'webhook.authentication': 'How should external systems authenticate when calling this webhook?',
      'manual.allowedRoles': 'Which user roles should be allowed to manually start this workflow?',
      'condition.checkInterval': 'How often should I check this condition? (in minutes)',
      'record.system': 'Which system should I monitor for new records? (Salesforce, HubSpot, etc.)',
      'record.entity': 'What type of records should trigger this? (leads, contacts, opportunities)'
    }

    return templates[question.configMapping] || question.question
  }

  /**
   * Detects trigger-related intent from user input
   */
  private detectTriggerIntent(userInput: string): string {
    const input = userInput.toLowerCase()
    
    // Manual trigger patterns
    if (input.match(/\b(button|click|submit|start|manual|user)\b/)) {
      return 'manual_trigger'
    }
    
    // Scheduled trigger patterns
    if (input.match(/\b(daily|weekly|monthly|schedule|every|cron|time)\b/)) {
      return 'scheduled_trigger'
    }
    
    // Email trigger patterns
    if (input.match(/\b(email|inbox|received|mail|message)\b/)) {
      return 'email_trigger'
    }
    
    // File trigger patterns
    if (input.match(/\b(file|upload|document|folder|attachment)\b/)) {
      return 'file_trigger'
    }
    
    // Record trigger patterns
    if (input.match(/\b(created|new|added|record|lead|contact)\b/)) {
      return 'record_trigger'
    }
    
    // Webhook patterns
    if (input.match(/\b(webhook|api|notification|external|integration)\b/)) {
      return 'webhook_trigger'
    }
    
    // Condition patterns
    if (input.match(/\b(when|if|condition|check|monitor|status)\b/)) {
      return 'condition_trigger'
    }
    
    return 'general_trigger'
  }

  /**
   * Finds matching triggers based on keywords and confidence
   */
  private findTriggerMatches(userInput: string): Array<{
    template: TriggerTemplate
    confidence: number
    reasons: string[]
    suggestedConfig: Partial<TriggerConfig>
    setupQuestions: TriggerSetupQuestion[]
  }> {
    const normalizedInput = userInput.toLowerCase()
    const inputWords = normalizedInput.split(/\s+/)
    const matches: any[] = []

    for (const trigger of this.triggers) {
      const confidence = this.calculateTriggerConfidence(normalizedInput, inputWords, trigger)
      
      if (confidence > 0.1) { // Minimum threshold
        const reasons = this.getTriggerMatchReasons(normalizedInput, inputWords, trigger)
        const suggestedConfig = this.extractConfigFromInput(userInput, trigger)
        
        matches.push({
          template: trigger,
          confidence,
          reasons,
          suggestedConfig,
          setupQuestions: trigger.setupQuestions.filter(q => 
            !suggestedConfig.hasOwnProperty(q.configMapping)
          )
        })
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Calculates confidence score for a trigger match
   */
  private calculateTriggerConfidence(
    input: string, 
    inputWords: string[], 
    trigger: TriggerTemplate
  ): number {
    let score = 0
    let totalWeight = 0

    // Check AI keywords
    for (const keyword of trigger.aiKeywords) {
      const keywordLower = keyword.keyword.toLowerCase()
      totalWeight += keyword.weight
      
      if (input.includes(keywordLower)) {
        score += keyword.weight
        
        // Bonus for exact word match
        if (inputWords.includes(keywordLower)) {
          score += keyword.weight * 0.5
        }
        
        // Context bonus
        if (keyword.context) {
          const contextMatches = keyword.context.filter(ctx => 
            input.includes(ctx.toLowerCase())
          ).length
          score += contextMatches * keyword.weight * 0.3
        }
      }
    }

    // Check typical use cases
    for (const useCase of trigger.typicalUseCases) {
      const useCaseLower = useCase.toLowerCase()
      if (input.includes(useCaseLower)) {
        score += 5 // Fixed weight for use case matches
        totalWeight += 5
      }
    }

    // Trigger name similarity
    const nameWords = trigger.name.toLowerCase().split(/\s+/)
    const nameMatches = nameWords.filter(word => inputWords.includes(word)).length
    if (nameMatches > 0) {
      score += nameMatches * 3
      totalWeight += nameWords.length * 3
    }

    // Normalize score
    return totalWeight > 0 ? Math.min(score / totalWeight, 1) : 0
  }

  /**
   * Gets reasons why a trigger was matched
   */
  private getTriggerMatchReasons(
    input: string, 
    inputWords: string[], 
    trigger: TriggerTemplate
  ): string[] {
    const reasons: string[] = []

    // Keyword matches
    const matchedKeywords = trigger.aiKeywords.filter(kw => 
      input.includes(kw.keyword.toLowerCase())
    )
    if (matchedKeywords.length > 0) {
      reasons.push(`Matched keywords: ${matchedKeywords.map(kw => kw.keyword).join(', ')}`)
    }

    // Use case matches
    const matchedUseCases = trigger.typicalUseCases.filter(uc => 
      input.includes(uc.toLowerCase())
    )
    if (matchedUseCases.length > 0) {
      reasons.push(`Similar to use cases: ${matchedUseCases.join(', ')}`)
    }

    // Name similarity
    const nameWords = trigger.name.toLowerCase().split(/\s+/)
    const nameMatches = nameWords.filter(word => inputWords.includes(word))
    if (nameMatches.length > 0) {
      reasons.push(`Trigger name contains: ${nameMatches.join(', ')}`)
    }

    return reasons
  }

  /**
   * Selects the best trigger automatically
   */
  private selectBestTrigger(matches: any[]): TriggerTemplate | undefined {
    if (matches.length === 0) return undefined
    
    // Auto-select if confidence is high enough
    const bestMatch = matches[0]
    if (bestMatch.confidence >= 0.7) {
      return bestMatch.template
    }
    
    return undefined
  }

  /**
   * Extracts configuration values from user input
   */
  private extractConfigFromInput(userInput: string, trigger: TriggerTemplate): Partial<TriggerConfig> {
    const config: Partial<TriggerConfig> = {}
    const input = userInput.toLowerCase()

    switch (trigger.type) {
      case 'scheduled':
        config.scheduled = {}
        
        // Extract schedule type
        if (input.includes('daily')) config.scheduled.type = 'daily'
        else if (input.includes('weekly')) config.scheduled.type = 'weekly'
        else if (input.includes('monthly')) config.scheduled.type = 'monthly'
        else if (input.includes('yearly')) config.scheduled.type = 'yearly'
        
        // Extract time
        const timeMatch = userInput.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
        if (timeMatch) {
          let hour = parseInt(timeMatch[1])
          const minute = timeMatch[2]
          const ampm = timeMatch[3]?.toLowerCase()
          
          if (ampm === 'pm' && hour !== 12) hour += 12
          if (ampm === 'am' && hour === 12) hour = 0
          
          config.scheduled.time = `${hour.toString().padStart(2, '0')}:${minute}`
        }
        
        config.scheduled.timezone = 'UTC' // Default
        break

      case 'email_received':
        config.email = {}
        
        // Extract email address
        const emailMatch = userInput.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
        if (emailMatch) {
          config.email.mailbox = emailMatch[0]
        }
        
        // Extract provider
        if (input.includes('gmail')) config.email.provider = 'gmail'
        else if (input.includes('outlook') || input.includes('office365')) config.email.provider = 'outlook'
        else if (input.includes('exchange')) config.email.provider = 'exchange'
        
        // Extract filters
        const fromMatch = userInput.match(/from\s+([^\s,]+)/i)
        if (fromMatch) config.email.fromFilter = fromMatch[1]
        
        const subjectMatch = userInput.match(/subject\s+["']([^"']+)["']/i)
        if (subjectMatch) config.email.subjectFilter = subjectMatch[1]
        
        break

      case 'file_added':
        config.file = {}
        
        // Extract platform
        if (input.includes('sharepoint')) config.file.platform = 'sharepoint'
        else if (input.includes('google drive')) config.file.platform = 'google_drive'
        else if (input.includes('dropbox')) config.file.platform = 'dropbox'
        else if (input.includes('onedrive')) config.file.platform = 'onedrive'
        
        // Extract folder path
        const folderMatch = userInput.match(/folder\s+["']([^"']+)["']/i) || 
                           userInput.match(/in\s+["']([^"']+)["']/i)
        if (folderMatch) config.file.folder = folderMatch[1]
        
        // Extract file types
        const fileTypeMatch = userInput.match(/\.(pdf|docx?|xlsx?|pptx?|txt|csv)/gi)
        if (fileTypeMatch) {
          config.file.fileTypes = fileTypeMatch.map(ext => ext.substring(1))
        }
        
        break

      case 'manual':
        config.manual = {}
        
        // Extract confirmation requirement
        if (input.includes('confirm') || input.includes('confirmation')) {
          config.manual.confirmationRequired = true
        }
        
        // Extract allowed roles
        const roleMatches = input.match(/\b(admin|manager|user|approver|builder)\b/gi)
        if (roleMatches) {
          config.manual.allowedRoles = roleMatches.map(role => role.toLowerCase())
        }
        
        break

      case 'webhook':
        config.webhook = {}
        
        // Extract authentication type
        if (input.includes('bearer')) config.webhook.authentication = { type: 'bearer' }
        else if (input.includes('api key')) config.webhook.authentication = { type: 'api_key' }
        else if (input.includes('basic auth')) config.webhook.authentication = { type: 'basic' }
        else config.webhook.authentication = { type: 'none' }
        
        config.webhook.method = 'POST' // Default
        
        break
    }

    return config
  }

  /**
   * Extracts answers from initial user input
   */
  private extractAnswersFromInput(userInput: string, conversation: TriggerConversation) {
    if (!conversation.currentTemplate) return

    const extracted = this.extractConfigFromInput(userInput, conversation.currentTemplate)
    
    // Map extracted config to answered questions
    for (const question of conversation.currentTemplate.setupQuestions) {
      const configPath = question.configMapping.split('.')
      let value = extracted
      
      for (const path of configPath) {
        value = value?.[path]
      }
      
      if (value !== undefined) {
        conversation.answeredQuestions[question.id] = value
        conversation.remainingQuestions = conversation.remainingQuestions.filter(q => q.id !== question.id)
      }
    }
  }

  /**
   * Generates final trigger configuration
   */
  private generateTriggerConfig(conversation: TriggerConversation): TriggerConfig {
    const config: TriggerConfig = {}
    
    if (!conversation.currentTemplate) return config

    // Map answers to config structure
    for (const [questionId, answer] of Object.entries(conversation.answeredQuestions)) {
      const question = conversation.currentTemplate.setupQuestions.find(q => q.id === questionId)
      if (!question) continue

      const configPath = question.configMapping.split('.')
      let target: any = config
      
      // Navigate to the correct nested object
      for (let i = 0; i < configPath.length - 1; i++) {
        const path = configPath[i]
        if (!target[path]) target[path] = {}
        target = target[path]
      }
      
      // Set the final value
      target[configPath[configPath.length - 1]] = answer
    }

    return config
  }

  /**
   * Default triggers for when database is unavailable
   */
  private getDefaultTriggers(): TriggerTemplate[] {
    return [
      {
        id: 'default-manual',
        name: 'Manual Start',
        description: 'User manually starts the workflow',
        type: 'manual',
        category: 'user_initiated',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        aiKeywords: [
          { keyword: 'button', weight: 8, triggerType: 'manual' },
          { keyword: 'submit', weight: 9, triggerType: 'manual' },
          { keyword: 'start', weight: 7, triggerType: 'manual' }
        ],
        typicalUseCases: ['Submit form', 'Start process', 'Manual trigger'],
        configSchema: { properties: {}, required: [] },
        icon: '👤',
        color: '#3B82F6',
        setupQuestions: []
      }
    ]
  }

  /**
   * Refreshes trigger cache
   */
  async refresh() {
    this.initialized = false
    await this.initialize()
  }
}