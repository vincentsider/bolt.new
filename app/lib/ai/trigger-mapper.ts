// Trigger Library AI Mapping System
import type { TriggerTemplate, TriggerConversation } from '~/types/trigger-library'

export interface TriggerSuggestion {
  autoSelected?: TriggerTemplate
  suggestions: TriggerTemplate[]
  confidence: number
}

export class TriggerMapper {
  private organizationId: string
  
  // Mock trigger library - in real implementation this would come from database
  private triggers: TriggerTemplate[] = [
    {
      id: 'manual-start',
      name: 'Manual Start',
      description: 'User manually initiates the workflow',
      category: 'user_initiated',
      configuration: {
        allowedRoles: ['builder', 'user', 'approver'],
        buttonText: 'Start Workflow',
        requiresInput: false
      },
      aiKeywords: ['manual', 'click', 'button', 'start', 'initiate', 'user'],
      proactiveQuestions: [
        'Who should be able to start this workflow?',
        'What should the start button say?',
        'Should users provide any initial information when starting?'
      ]
    },
    {
      id: 'scheduled-daily',
      name: 'Daily Schedule',
      description: 'Runs automatically every day at a specified time',
      category: 'time_based',
      configuration: {
        schedule: 'daily',
        time: '09:00',
        timezone: 'UTC'
      },
      aiKeywords: ['daily', 'every day', 'schedule', 'automatic', 'recurring'],
      proactiveQuestions: [
        'What time should this run daily?',
        'What timezone should we use?',
        'Should it run on weekends too?'
      ]
    },
    {
      id: 'email-received',
      name: 'Email Received',
      description: 'Triggers when an email is received at a monitored address',
      category: 'event_based',
      configuration: {
        emailAddress: '',
        subjectFilter: '',
        senderFilter: ''
      },
      aiKeywords: ['email', 'received', 'inbox', 'message', 'mail'],
      proactiveQuestions: [
        'Which email address should we monitor?',
        'Should we filter by subject line?',
        'Should we filter by sender?'
      ]
    },
    {
      id: 'file-uploaded',
      name: 'File Uploaded',
      description: 'Triggers when a file is uploaded to a monitored location',
      category: 'event_based',
      configuration: {
        location: '',
        fileTypes: [],
        monitorSubfolders: true
      },
      aiKeywords: ['file', 'upload', 'document', 'folder', 'share'],
      proactiveQuestions: [
        'Which folder should we monitor?',
        'What file types should trigger the workflow?',
        'Should we monitor subfolders too?'
      ]
    }
  ]

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  async suggestTriggers(userInput: string): Promise<TriggerSuggestion> {
    const input = userInput.toLowerCase()
    
    // Analyze input for trigger keywords
    const scoredTriggers = this.triggers.map(trigger => {
      let score = 0
      
      // Check for keyword matches
      trigger.aiKeywords.forEach(keyword => {
        if (input.includes(keyword.toLowerCase())) {
          score += 10
        }
      })
      
      // Check for trigger-specific patterns
      if (input.includes('when') || input.includes('automatically')) {
        score += 5
      }
      
      if (input.includes('schedule') || input.includes('daily') || input.includes('time')) {
        if (trigger.category === 'time_based') score += 15
      }
      
      if (input.includes('email') || input.includes('message')) {
        if (trigger.id === 'email-received') score += 15
      }
      
      if (input.includes('file') || input.includes('upload')) {
        if (trigger.id === 'file-uploaded') score += 15
      }
      
      return { trigger, score }
    })
    
    // Sort by score
    const sorted = scoredTriggers
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0)
    
    const suggestions = sorted.map(item => item.trigger)
    const topScore = sorted[0]?.score || 0
    
    // Auto-select if confidence is high enough
    const autoSelected = topScore >= 15 ? sorted[0].trigger : undefined
    
    return {
      autoSelected,
      suggestions: suggestions.slice(0, 3),
      confidence: topScore
    }
  }

  generateProactiveQuestions(userInput: string, selectedTrigger: TriggerTemplate): string[] {
    // Return the predefined questions for this trigger
    return selectedTrigger.proactiveQuestions || []
  }

  async createTriggerConversation(
    workflowId: string,
    triggerId: string,
    userResponses: Record<string, any>
  ): Promise<TriggerConversation> {
    const trigger = this.triggers.find(t => t.id === triggerId)
    
    if (!trigger) {
      throw new Error(`Trigger ${triggerId} not found`)
    }
    
    return {
      id: `conv-${Date.now()}`,
      workflowId,
      triggerId,
      triggerName: trigger.name,
      questions: trigger.proactiveQuestions || [],
      responses: userResponses,
      status: 'completed',
      createdAt: new Date()
    }
  }

  // Get all available triggers for the organization
  async getAvailableTriggers(): Promise<TriggerTemplate[]> {
    // In real implementation, this would query the database
    return this.triggers
  }

  // Check if a trigger configuration is valid
  validateTriggerConfiguration(triggerId: string, config: any): { valid: boolean, errors: string[] } {
    const trigger = this.triggers.find(t => t.id === triggerId)
    
    if (!trigger) {
      return { valid: false, errors: ['Trigger not found'] }
    }
    
    const errors: string[] = []
    
    // Basic validation based on trigger type
    switch (trigger.id) {
      case 'email-received':
        if (!config.emailAddress) {
          errors.push('Email address is required')
        }
        break
      
      case 'scheduled-daily':
        if (!config.time) {
          errors.push('Time is required for scheduled triggers')
        }
        break
      
      case 'file-uploaded':
        if (!config.location) {
          errors.push('Folder location is required')
        }
        break
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}