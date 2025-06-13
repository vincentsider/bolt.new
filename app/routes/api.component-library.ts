import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node'
import { supabase } from '~/lib/supabase'
import type { 
  ComponentDefinition, 
  CreateComponentRequest, 
  UpdateComponentRequest,
  ComponentStats 
} from '~/types/component-library'

// GET /api/component-library - List components
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organization_id')
  const group = url.searchParams.get('group')
  const active = url.searchParams.get('active')
  const step = url.searchParams.get('step')
  
  if (!organizationId) {
    return Response.json({ error: 'Organization ID required' }, { status: 400 })
  }

  try {
    let query = supabase
      .from('component_definitions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (group) {
      query = query.eq('group', group)
    }

    if (active !== null) {
      query = query.eq('active', active === 'true')
    }

    if (step) {
      query = query.contains('compatible_steps', [step])
    }

    const { data: components, error } = await query

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: 'Failed to fetch components' }, { status: 500 })
    }

    return Response.json({ 
      components: components || [],
      total: components?.length || 0
    })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/component-library - Create component
export async function action({ request }: ActionFunctionArgs) {
  if (request.method === 'POST') {
    return createComponent(request)
  }
  
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

async function createComponent(request: Request) {
  try {
    const body: CreateComponentRequest & { organizationId: string; createdBy: string } = await request.json()
    
    const componentData = {
      organization_id: body.organizationId,
      name: body.name,
      description: body.description,
      group: body.group,
      type: body.type,
      active: body.active,
      ai_keywords: body.aiKeywords,
      typical_examples: body.typicalExamples,
      properties: body.properties,
      icon: body.icon,
      color: body.color,
      compatible_steps: body.compatibleSteps,
      html_template: body.htmlTemplate,
      css_classes: body.cssClasses,
      js_validation: body.jsValidation,
      api_endpoint: body.apiEndpoint,
      data_mapping: body.dataMapping,
      created_by: body.createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('component_definitions')
      .insert(componentData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: 'Failed to create component' }, { status: 500 })
    }

    return Response.json({ component: data }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Invalid request data' }, { status: 400 })
  }
}