import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare'
import { supabase } from '~/lib/supabase'
import type { UpdateComponentRequest } from '~/types/component-library'

// GET /api/component-library/:id - Get single component
export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params
  
  if (!id) {
    return Response.json({ error: 'Component ID required' }, { status: 400 })
  }

  try {
    const { data: component, error } = await supabase
      .from('component_definitions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: 'Component not found' }, { status: 404 })
    }

    return Response.json({ component })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/component-library/:id - Update component
// PATCH /api/component-library/:id - Partial update component
// DELETE /api/component-library/:id - Delete component
export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params
  
  if (!id) {
    return Response.json({ error: 'Component ID required' }, { status: 400 })
  }

  switch (request.method) {
    case 'PUT':
    case 'PATCH':
      return updateComponent(request, id)
    case 'DELETE':
      return deleteComponent(id)
    default:
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

async function updateComponent(request: Request, id: string) {
  try {
    const body: Partial<UpdateComponentRequest> = await request.json()
    
    // Convert camelCase to snake_case for database
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.group !== undefined) updateData.group = body.group
    if (body.type !== undefined) updateData.type = body.type
    if (body.active !== undefined) updateData.active = body.active
    if (body.aiKeywords !== undefined) updateData.ai_keywords = body.aiKeywords
    if (body.typicalExamples !== undefined) updateData.typical_examples = body.typicalExamples
    if (body.properties !== undefined) updateData.properties = body.properties
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.color !== undefined) updateData.color = body.color
    if (body.compatibleSteps !== undefined) updateData.compatible_steps = body.compatibleSteps
    if (body.htmlTemplate !== undefined) updateData.html_template = body.htmlTemplate
    if (body.cssClasses !== undefined) updateData.css_classes = body.cssClasses
    if (body.jsValidation !== undefined) updateData.js_validation = body.jsValidation
    if (body.apiEndpoint !== undefined) updateData.api_endpoint = body.apiEndpoint
    if (body.dataMapping !== undefined) updateData.data_mapping = body.dataMapping

    const { data, error } = await supabase
      .from('component_definitions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: 'Failed to update component' }, { status: 500 })
    }

    return Response.json({ component: data })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Invalid request data' }, { status: 400 })
  }
}

async function deleteComponent(id: string) {
  try {
    // Check if component is being used in any workflows
    const { data: usageCheck, error: usageError } = await supabase
      .from('component_instances')
      .select('id')
      .eq('component_id', id)
      .limit(1)

    if (usageError) {
      console.error('Usage check error:', usageError)
      return Response.json({ error: 'Failed to check component usage' }, { status: 500 })
    }

    if (usageCheck && usageCheck.length > 0) {
      return Response.json({ 
        error: 'Cannot delete component: it is currently being used in workflows' 
      }, { status: 409 })
    }

    const { error } = await supabase
      .from('component_definitions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: 'Failed to delete component' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}