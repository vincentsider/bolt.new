// Component Library AI Mapping System
import { supabase } from '~/lib/supabase'

export interface ComponentSuggestion {
  id: string
  name: string
  description: string
  component_group: string
  component_type: string
  confidence: number
  matches: string[]
  html_template: string
  compatible_steps: string[]
}

export interface ComponentMapping {
  step: 'capture' | 'review' | 'approval' | 'update'
  matches: ComponentSuggestion[]
  totalComponents: number
}

export class ComponentMapper {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  async mapComponents(userInput: string, step: 'capture' | 'review' | 'approval' | 'update'): Promise<ComponentMapping> {
    try {
      console.log(`🔍 Mapping components for step: ${step}`)
      
      // Get available components for this organization and step
      const { data: components, error } = await supabase
        .from('component_definitions')
        .select('*')
        .eq('organization_id', this.organizationId)
        .eq('active', true)
        .contains('compatible_steps', [step])

      if (error) {
        console.error('Error fetching components:', error)
        return { step, matches: [], totalComponents: 0 }
      }

      if (!components || components.length === 0) {
        console.log(`No components found for step: ${step}`)
        return { step, matches: [], totalComponents: 0 }
      }

      // Analyze user input and match against component keywords
      const matches = this.analyzeInputForComponents(userInput, components)
      
      console.log(`Found ${matches.length} component matches for step: ${step}`)
      
      return {
        step,
        matches,
        totalComponents: components.length
      }
    } catch (error) {
      console.error('Component mapping failed:', error)
      return { step, matches: [], totalComponents: 0 }
    }
  }

  private analyzeInputForComponents(userInput: string, components: any[]): ComponentSuggestion[] {
    const input = userInput.toLowerCase()
    const suggestions: ComponentSuggestion[] = []

    for (const component of components) {
      let confidence = 0
      const matches: string[] = []

      // Check AI keywords
      if (component.ai_keywords) {
        for (const keywordObj of component.ai_keywords) {
          if (typeof keywordObj === 'object' && keywordObj.keyword) {
            const keyword = keywordObj.keyword.toLowerCase()
            const weight = keywordObj.weight || 1
            
            if (input.includes(keyword)) {
              confidence += weight
              matches.push(keyword)
            }
          }
        }
      }

      // Check typical examples
      if (component.typical_examples) {
        for (const example of component.typical_examples) {
          if (input.includes(example.toLowerCase())) {
            confidence += 5
            matches.push(example)
          }
        }
      }

      // Check component name and description
      if (input.includes(component.name.toLowerCase())) {
        confidence += 10
        matches.push(component.name)
      }

      if (input.includes(component.description.toLowerCase().split(' ')[0])) {
        confidence += 3
      }

      // Include component if it has any matches
      if (confidence > 0) {
        suggestions.push({
          id: component.id,
          name: component.name,
          description: component.description,
          component_group: component.component_group,
          component_type: component.component_type,
          confidence,
          matches,
          html_template: component.html_template,
          compatible_steps: component.compatible_steps
        })
      }
    }

    // Sort by confidence (highest first) and return top 10
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
  }

  async suggestComponentsForWorkflow(workflowDescription: string): Promise<{
    capture: ComponentSuggestion[]
    review: ComponentSuggestion[]
    approval: ComponentSuggestion[]
    update: ComponentSuggestion[]
  }> {
    console.log('🎯 Analyzing workflow for component suggestions...')
    
    const [capture, review, approval, update] = await Promise.all([
      this.mapComponents(workflowDescription, 'capture'),
      this.mapComponents(workflowDescription, 'review'),
      this.mapComponents(workflowDescription, 'approval'),
      this.mapComponents(workflowDescription, 'update')
    ])

    return {
      capture: capture.matches,
      review: review.matches,
      approval: approval.matches,
      update: update.matches
    }
  }

  // Helper method to create component instances for a workflow
  async createComponentInstance(
    workflowId: string,
    componentId: string,
    label: string,
    config: any = {},
    position: { step: string, order: number }
  ) {
    try {
      const { data, error } = await supabase
        .from('component_instances')
        .insert({
          workflow_id: workflowId,
          component_id: componentId,
          organization_id: this.organizationId,
          label,
          config,
          position,
          required: config.required || false,
          validation: config.validation || {}
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating component instance:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to create component instance:', error)
      return null
    }
  }
}