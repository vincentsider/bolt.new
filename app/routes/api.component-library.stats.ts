import { type LoaderFunctionArgs } from '@remix-run/cloudflare'
import { supabase } from '~/lib/supabase'
import type { ComponentStats, ComponentGroup } from '~/types/component-library'

// GET /api/component-library/stats - Get component statistics
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organization_id')
  
  if (!organizationId) {
    return Response.json({ error: 'Organization ID required' }, { status: 400 })
  }

  try {
    // Get all components for the organization
    const { data: components, error: componentsError } = await supabase
      .from('component_definitions')
      .select('id, group, active')
      .eq('organization_id', organizationId)

    if (componentsError) {
      console.error('Components query error:', componentsError)
      return Response.json({ error: 'Failed to fetch components' }, { status: 500 })
    }

    // Get usage statistics
    const { data: usage, error: usageError } = await supabase
      .from('component_instances')
      .select('component_id')
      .in('component_id', components?.map(c => c.id) || [])

    if (usageError) {
      console.error('Usage query error:', usageError)
      return Response.json({ error: 'Failed to fetch usage stats' }, { status: 500 })
    }

    // Calculate statistics
    const totalComponents = components?.length || 0
    const activeComponents = components?.filter(c => c.active).length || 0
    
    // Group by component group
    const componentsByGroup: Record<ComponentGroup, number> = {
      basic_inputs: 0,
      document_handling: 0,
      lookups_status: 0,
      financial_specific: 0,
      layout_helpers: 0,
      approval_signoff: 0,
      automation_hooks: 0
    }
    
    components?.forEach(component => {
      if (component.group in componentsByGroup) {
        componentsByGroup[component.group as ComponentGroup]++
      }
    })

    // Calculate usage stats per component
    const usageStats: Record<string, number> = {}
    usage?.forEach(u => {
      usageStats[u.component_id] = (usageStats[u.component_id] || 0) + 1
    })

    const stats: ComponentStats = {
      totalComponents,
      activeComponents,
      componentsByGroup,
      usageStats,
      lastUpdated: new Date().toISOString()
    }

    return Response.json(stats)
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}