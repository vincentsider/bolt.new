// Server-side Component Library AI Mapping System
import { getSupabaseServer } from './supabase'

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
  private context?: any

  constructor(organizationId: string, context?: any) {
    this.organizationId = organizationId
    this.context = context
  }

  async mapComponents(userInput: string, step: 'capture' | 'review' | 'approval' | 'update'): Promise<ComponentMapping> {
    try {
      console.log(`🔍 Mapping components for step: ${step}`)
      console.log(`📌 Environment check:`)
      if (this.context?.cloudflare?.env) {
        console.log(`   Using Cloudflare context environment`)
        console.log(`   - SUPABASE_URL: ${this.context.cloudflare.env.SUPABASE_URL ? 'Set' : 'NOT SET'}`)
        console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${this.context.cloudflare.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'NOT SET'}`)
        console.log(`   - SUPABASE_ANON_KEY: ${this.context.cloudflare.env.SUPABASE_ANON_KEY ? 'Set' : 'NOT SET'}`)
      } else {
        console.log(`   Using process.env (local development)`)
        console.log(`   - SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'NOT SET'}`)
        console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'NOT SET'}`)
        console.log(`   - SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'Set' : 'NOT SET'}`)
      }
      
      let supabase;
      try {
        supabase = getSupabaseServer(this.context)
        console.log('✅ Supabase server client created successfully')
      } catch (error) {
        console.error('❌ Failed to create Supabase client:', error)
        throw error
      }
      
      // Get available components for this organization and step
      console.log(`🔍 Querying component_definitions for org: ${this.organizationId}, step: ${step}`)
      
      // Query components - note: using 'in' operator for array contains
      console.log(`🔍 Executing query for org=${this.organizationId}, active=true`)
      
      const { data: components, error } = await supabase
        .from('component_definitions')
        .select('*')
        .eq('organization_id', this.organizationId)
        .eq('active', true)
      
      console.log(`📊 Query result: ${components?.length || 0} components found`)
      if (components && components.length > 0) {
        console.log(`📋 First component: ${components[0].name} (${components[0].id})`)
      }

      if (error) {
        console.error('❌ Supabase query error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return { step, matches: [], totalComponents: 0 }
      }

      if (!components || components.length === 0) {
        console.log(`No active components found for organization`)
        return { step, matches: [], totalComponents: 0 }
      }
      
      // Filter by compatible steps
      const filteredComponents = components.filter(comp => {
        const compatibleSteps = comp.compatible_steps || [];
        return compatibleSteps.includes(step);
      });
      
      console.log(`✅ Found ${components.length} total components, ${filteredComponents.length} compatible with step: ${step}`)

      // Calculate relevance scores
      const scoredComponents = filteredComponents.map(component => {
        const score = this.calculateRelevanceScore(
          userInput,
          component.ai_keywords || [],
          component.name,
          component.description
        )
        
        return {
          ...component,
          confidence: score.confidence,
          matches: score.matches
        }
      })

      // Filter and sort by confidence
      const relevantComponents = scoredComponents
        .filter(c => c.confidence > 0)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10) // Top 10 most relevant

      console.log(`✅ Found ${relevantComponents.length} relevant components for step: ${step}`)
      
      // If no relevant components found, return all compatible components
      if (relevantComponents.length === 0 && filteredComponents.length > 0) {
        console.log(`⚠️ No keyword matches found, returning all ${filteredComponents.length} compatible components for step: ${step}`)
        return {
          step,
          matches: filteredComponents.slice(0, 10).map(comp => ({
            ...comp,
            confidence: 1,
            matches: ['Default selection']
          })),
          totalComponents: filteredComponents.length
        }
      }

      return {
        step,
        matches: relevantComponents,
        totalComponents: filteredComponents.length
      }
    } catch (error) {
      console.error('Error in mapComponents:', error)
      return { step, matches: [], totalComponents: 0 }
    }
  }

  private calculateRelevanceScore(
    userInput: string, 
    keywords: string[], 
    name: string, 
    description: string
  ): { confidence: number; matches: string[] } {
    const input = userInput.toLowerCase()
    const matches: string[] = []
    let score = 0

    // Direct name match (highest weight)
    if (input.includes(name.toLowerCase())) {
      score += 10
      matches.push(`Name: ${name}`)
    }

    // Keyword matches (high weight)
    keywords.forEach(keywordObj => {
      // Handle both string keywords and object keywords {keyword: "word", weight: 5}
      const keyword = typeof keywordObj === 'string' ? keywordObj : keywordObj.keyword
      const weight = typeof keywordObj === 'object' ? (keywordObj.weight || 5) : 5
      
      if (keyword && input.includes(keyword.toLowerCase())) {
        score += weight
        matches.push(`Keyword: ${keyword}`)
      }
    })

    // Description word matches (medium weight)
    const descWords = description.toLowerCase().split(/\s+/)
    const inputWords = input.split(/\s+/)
    
    descWords.forEach(word => {
      if (word.length > 3 && inputWords.includes(word)) {
        score += 2
        matches.push(`Word: ${word}`)
      }
    })

    // Context-based scoring
    if (input.includes('expense') && (name.includes('amount') || name.includes('currency'))) {
      score += 3
      matches.push('Context: expense+amount')
    }
    
    if (input.includes('employee') && (name.includes('name') || name.includes('employee'))) {
      score += 3
      matches.push('Context: employee info')
    }

    if (input.includes('approval') && (name.includes('approve') || name.includes('button'))) {
      score += 3
      matches.push('Context: approval action')
    }

    return {
      confidence: Math.min(score, 10), // Cap at 10
      matches: [...new Set(matches)] // Remove duplicates
    }
  }

  async suggestComponentsForWorkflow(workflowDescription: string): Promise<{
    capture: ComponentSuggestion[]
    review: ComponentSuggestion[]
    approval: ComponentSuggestion[]
    update: ComponentSuggestion[]
  }> {
    console.log('🎯 Analyzing workflow for component suggestions...')
    
    // Map components for each workflow step
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
}