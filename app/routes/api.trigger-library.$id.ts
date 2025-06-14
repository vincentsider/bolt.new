import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/node'
import { createClient } from '@supabase/supabase-js'
import type { UpdateTriggerTemplateRequest } from '~/types/trigger-library'

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { id } = params
  
  if (!id) {
    return json({ error: 'Trigger ID is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { data: triggerTemplate, error } = await supabase
      .from('trigger_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !triggerTemplate) {
      return json({ error: 'Trigger template not found' }, { status: 404 })
    }

    return json({ trigger: triggerTemplate })

  } catch (error) {
    console.error('Trigger template fetch error:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const { id } = params
  const method = request.method

  if (!id) {
    return json({ error: 'Trigger ID is required' }, { status: 400 })
  }

  switch (method) {
    case 'PUT':
      return handleUpdate(request, id, context)
    case 'DELETE':
      return handleDelete(id, context)
    case 'PATCH':
      return handleToggle(request, id, context)
    default:
      return json({ error: 'Method not allowed' }, { status: 405 })
  }
}

async function handleUpdate(request: Request, id: string, context: any) {
  try {
    const body = await request.json() as UpdateTriggerTemplateRequest

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const updateData: any = {}
    
    // Map frontend fields to database fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.type !== undefined) updateData.type = body.type
    if (body.category !== undefined) updateData.category = body.category
    if (body.active !== undefined) updateData.active = body.active
    if (body.aiKeywords !== undefined) updateData.ai_keywords = body.aiKeywords
    if (body.typicalUseCases !== undefined) updateData.typical_use_cases = body.typicalUseCases
    if (body.configSchema !== undefined) updateData.config_schema = body.configSchema
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.color !== undefined) updateData.color = body.color
    if (body.setupQuestions !== undefined) updateData.setup_questions = body.setupQuestions
    if (body.requiredIntegrations !== undefined) updateData.required_integrations = body.requiredIntegrations
    if (body.supportedSystems !== undefined) updateData.supported_systems = body.supportedSystems

    updateData.updated_at = new Date().toISOString()

    const { data: triggerTemplate, error } = await supabase
      .from('trigger_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database update error:', error)
      return json({ error: 'Failed to update trigger template' }, { status: 500 })
    }

    return json({ 
      message: 'Trigger template updated successfully',
      trigger: triggerTemplate
    })

  } catch (error) {
    console.error('Update trigger error:', error)
    return json({ error: 'Invalid request data' }, { status: 400 })
  }
}

async function handleDelete(id: string, context: any) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // First check if trigger is in use
    const { data: workflowTriggers, error: checkError } = await supabase
      .from('workflow_triggers')
      .select('id')
      .eq('template_id', id)
      .limit(1)

    if (checkError) {
      console.error('Check usage error:', checkError)
      return json({ error: 'Failed to check trigger usage' }, { status: 500 })
    }

    if (workflowTriggers && workflowTriggers.length > 0) {
      return json({ 
        error: 'Cannot delete trigger template that is currently in use by workflows' 
      }, { status: 409 })
    }

    const { error } = await supabase
      .from('trigger_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database delete error:', error)
      return json({ error: 'Failed to delete trigger template' }, { status: 500 })
    }

    return json({ message: 'Trigger template deleted successfully' })

  } catch (error) {
    console.error('Delete trigger error:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleToggle(request: Request, id: string, context: any) {
  try {
    const { active } = await request.json()

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: triggerTemplate, error } = await supabase
      .from('trigger_templates')
      .update({ 
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database toggle error:', error)
      return json({ error: 'Failed to toggle trigger status' }, { status: 500 })
    }

    return json({ 
      message: `Trigger template ${active ? 'activated' : 'deactivated'} successfully`,
      trigger: triggerTemplate
    })

  } catch (error) {
    console.error('Toggle trigger error:', error)
    return json({ error: 'Invalid request data' }, { status: 400 })
  }
}