// AI Component Mapping Intelligence
// Maps natural language to appropriate workflow components

import type {
  ComponentDefinition,
  ComponentMatch,
  ComponentSuggestion,
  WorkflowStepType,
  ComponentInstance
} from '~/types/component-library'

export class ComponentMapper {
  private components: ComponentDefinition[] = []
  private initialized = false

  constructor(private organizationId: string) {}

  async initialize() {
    if (this.initialized) return
    
    try {
      const response = await fetch(`/api/component-library?organization_id=${this.organizationId}&active=true`)
      const data = await response.json()
      this.components = data.components || []
      this.initialized = true
      console.log(`Initialized ComponentMapper with ${this.components.length} active components`)
    } catch (error) {
      console.error('Failed to initialize ComponentMapper:', error)
      this.components = this.getDefaultComponents()
      this.initialized = true
    }
  }

  /**
   * Maps natural language input to appropriate components
   */
  async mapComponents(userInput: string, targetStep: WorkflowStepType): Promise<ComponentSuggestion> {
    await this.initialize()
    
    const detectedIntent = this.detectIntent(userInput)
    const matches = this.findMatches(userInput, targetStep)
    const autoSelected = this.selectBestMatch(matches)
    
    console.log(`Component mapping for "${userInput}":`)
    console.log(`- Detected intent: ${detectedIntent}`)
    console.log(`- Found ${matches.length} matches`)
    console.log(`- Auto-selected: ${autoSelected?.name || 'None'}`)
    
    return {
      userInput,
      detectedIntent,
      targetStep,
      matches,
      autoSelected
    }
  }

  /**
   * Finds matching components based on keywords and context
   */
  private findMatches(userInput: string, targetStep: WorkflowStepType): ComponentMatch[] {
    const normalizedInput = userInput.toLowerCase()
    const inputWords = normalizedInput.split(/\s+/)
    const matches: ComponentMatch[] = []

    // Filter components compatible with the target step
    const compatibleComponents = this.components.filter(component => 
      component.compatibleSteps.includes(targetStep) && component.active
    )

    for (const component of compatibleComponents) {
      const confidence = this.calculateConfidence(normalizedInput, inputWords, component)
      
      if (confidence > 0.1) { // Minimum threshold
        const reasons = this.getMatchReasons(normalizedInput, inputWords, component)
        const suggestedConfig = this.generateSuggestedConfig(userInput, component)
        
        matches.push({
          component,
          confidence,
          reasons,
          suggestedConfig
        })
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Calculates confidence score for a component match
   */
  private calculateConfidence(input: string, inputWords: string[], component: ComponentDefinition): number {
    let score = 0
    let totalWeight = 0

    // Check AI keywords
    for (const keyword of component.aiKeywords) {
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

    // Check typical examples
    for (const example of component.typicalExamples) {
      const exampleLower = example.toLowerCase()
      if (input.includes(exampleLower)) {
        score += 3 // Fixed weight for example matches
        totalWeight += 3
      }
    }

    // Component name similarity
    const nameWords = component.name.toLowerCase().split(/\s+/)
    const nameMatches = nameWords.filter(word => inputWords.includes(word)).length
    if (nameMatches > 0) {
      score += nameMatches * 2
      totalWeight += nameWords.length * 2
    }

    // Normalize score
    return totalWeight > 0 ? Math.min(score / totalWeight, 1) : 0
  }

  /**
   * Generates reasons why a component was matched
   */
  private getMatchReasons(input: string, inputWords: string[], component: ComponentDefinition): string[] {
    const reasons: string[] = []

    // Keyword matches
    const matchedKeywords = component.aiKeywords.filter(kw => 
      input.includes(kw.keyword.toLowerCase())
    )
    if (matchedKeywords.length > 0) {
      reasons.push(`Matched keywords: ${matchedKeywords.map(kw => kw.keyword).join(', ')}`)
    }

    // Example matches
    const matchedExamples = component.typicalExamples.filter(ex => 
      input.includes(ex.toLowerCase())
    )
    if (matchedExamples.length > 0) {
      reasons.push(`Similar to examples: ${matchedExamples.join(', ')}`)
    }

    // Name similarity
    const nameWords = component.name.toLowerCase().split(/\s+/)
    const nameMatches = nameWords.filter(word => inputWords.includes(word))
    if (nameMatches.length > 0) {
      reasons.push(`Component name contains: ${nameMatches.join(', ')}`)
    }

    return reasons
  }

  /**
   * Generates suggested configuration for a component
   */
  private generateSuggestedConfig(userInput: string, component: ComponentDefinition): Record<string, any> {
    const config: Record<string, any> = {}
    
    // Extract potential label from user input
    const label = this.extractLabel(userInput, component)
    if (label) {
      config.label = label
    }

    // Set required based on keywords
    const requiredKeywords = ['required', 'mandatory', 'must', 'needed']
    config.required = requiredKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    )

    // Component-specific configurations
    switch (component.type) {
      case 'dropdown_list':
      case 'multi_select_list':
        config.options = this.extractOptions(userInput)
        break
        
      case 'number_field':
        config.min = this.extractNumber(userInput, 'min')
        config.max = this.extractNumber(userInput, 'max')
        config.step = userInput.includes('decimal') ? 0.01 : 1
        break
        
      case 'file_upload':
        config.accept = this.extractFileTypes(userInput)
        config.multiple = userInput.includes('multiple') || userInput.includes('several')
        break
        
      case 'date_picker':
        config.format = 'YYYY-MM-DD'
        if (userInput.includes('time')) {
          config.includeTime = true
        }
        break
    }

    return config
  }

  /**
   * Selects the best match from available matches
   */
  private selectBestMatch(matches: ComponentMatch[]): ComponentDefinition | undefined {
    if (matches.length === 0) return undefined
    
    // Auto-select if confidence is high enough
    const bestMatch = matches[0]
    if (bestMatch.confidence >= 0.7) {
      return bestMatch.component
    }
    
    return undefined
  }

  /**
   * Detects the intent from user input
   */
  private detectIntent(userInput: string): string {
    const input = userInput.toLowerCase()
    
    // Data collection patterns
    if (input.match(/collect|gather|capture|input|enter/)) {
      return 'data_collection'
    }
    
    // File upload patterns
    if (input.match(/upload|attach|file|document|image|pdf/)) {
      return 'file_upload'
    }
    
    // Selection patterns
    if (input.match(/choose|select|pick|dropdown|list|options/)) {
      return 'selection'
    }
    
    // Approval patterns
    if (input.match(/approve|reject|sign|signature|decision/)) {
      return 'approval'
    }
    
    // Display patterns
    if (input.match(/show|display|view|status|badge/)) {
      return 'display'
    }
    
    return 'general_input'
  }

  // Helper methods for extracting specific information
  private extractLabel(userInput: string, component: ComponentDefinition): string | null {
    // Try to extract quoted strings as labels
    const quotedMatch = userInput.match(/["']([^"']+)["']/)
    if (quotedMatch) {
      return quotedMatch[1]
    }
    
    // Look for common label patterns
    const labelPatterns = [
      /for\s+([\w\s]+?)(?:\s|$)/,
      /called\s+([\w\s]+?)(?:\s|$)/,
      /named\s+([\w\s]+?)(?:\s|$)/,
      /\"([\w\s]+?)\"/
    ]
    
    for (const pattern of labelPatterns) {
      const match = userInput.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    return null
  }

  private extractOptions(userInput: string): string[] {
    const options: string[] = []
    
    // Look for comma-separated lists
    const listMatch = userInput.match(/\(([^)]+)\)/)
    if (listMatch) {
      return listMatch[1].split(',').map(opt => opt.trim())
    }
    
    // Look for "or" separated options
    const orMatch = userInput.match(/(?:choose|select)\s+(?:from\s+)?([^.]+)/)
    if (orMatch) {
      return orMatch[1].split(/\s+or\s+/).map(opt => opt.trim())
    }
    
    return options
  }

  private extractNumber(userInput: string, type: 'min' | 'max'): number | undefined {
    const pattern = new RegExp(`${type}\s+(\\d+)`, 'i')
    const match = userInput.match(pattern)
    return match ? parseInt(match[1]) : undefined
  }

  private extractFileTypes(userInput: string): string {
    if (userInput.includes('image')) return 'image/*'
    if (userInput.includes('pdf')) return '.pdf'
    if (userInput.includes('document')) return '.pdf,.doc,.docx'
    if (userInput.includes('excel') || userInput.includes('spreadsheet')) return '.xlsx,.xls'
    return '*'
  }

  /**
   * Default components for when database is unavailable
   */
  private getDefaultComponents(): ComponentDefinition[] {
    return [
      {
        id: 'default-text',
        name: 'Short Text Box',
        description: 'Lets a user type a small piece of information',
        group: 'basic_inputs',
        type: 'short_text_box',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        aiKeywords: [
          { keyword: 'name', weight: 8 },
          { keyword: 'text', weight: 7 },
          { keyword: 'input', weight: 6 },
          { keyword: 'field', weight: 5 }
        ],
        typicalExamples: ['First name', 'Last name', 'Email address'],
        properties: [],
        icon: '📝',
        color: '#3B82F6',
        compatibleSteps: ['capture'],
        htmlTemplate: '<input type="text" class="form-input" />',
        cssClasses: ['form-input']
      }
      // Add more default components as needed
    ]
  }

  /**
   * Creates component instances from user input
   */
  async createComponentInstances(
    userInput: string, 
    targetStep: WorkflowStepType,
    workflowId: string
  ): Promise<ComponentInstance[]> {
    const suggestion = await this.mapComponents(userInput, targetStep)
    const instances: ComponentInstance[] = []
    
    if (suggestion.autoSelected) {
      const match = suggestion.matches.find(m => m.component.id === suggestion.autoSelected!.id)
      if (match) {
        instances.push({
          id: `instance-${Date.now()}`,
          componentId: suggestion.autoSelected.id,
          label: match.suggestedConfig.label || suggestion.autoSelected.name,
          required: match.suggestedConfig.required || false,
          config: match.suggestedConfig,
          validation: {
            rules: [],
            errorMessage: undefined
          },
          position: {
            step: targetStep,
            order: 0
          }
        })
      }
    }
    
    return instances
  }

  /**
   * Refreshes component cache
   */
  async refresh() {
    this.initialized = false
    await this.initialize()
  }
}