import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/node'
import { createClient } from '@supabase/supabase-js'
import type { 
  TriggerTemplate, 
  TriggerTemplateTable,
  CreateTriggerTemplateRequest,
  TriggerStats,
  TriggerFilter
} from '~/types/trigger-library'

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organization_id')
  const active = url.searchParams.get('active')
  const type = url.searchParams.get('type')
  const category = url.searchParams.get('category')
  
  if (!organizationId) {
    return json({ error: 'Organization ID is required' }, { status: 400 })
  }

  const supabase = createClient(
    context.cloudflare.env.SUPABASE_URL,
    context.cloudflare.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    let query = supabase
      .from('trigger_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (active !== null) {
      query = query.eq('active', active === 'true')
    }
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: triggerTemplates, error } = await query

    if (error) {
      console.error('Database error:', error)
      return json({ error: 'Failed to fetch trigger templates' }, { status: 500 })
    }

    // Transform database records to frontend format
    const triggers: TriggerTemplate[] = (triggerTemplates || []).map((row: TriggerTemplateTable) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      category: row.category,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      aiKeywords: row.ai_keywords || [],
      typicalUseCases: row.typical_use_cases || [],
      configSchema: row.config_schema || { properties: {}, required: [] },
      icon: row.icon,
      color: row.color,
      setupQuestions: row.setup_questions || [],
      requiredIntegrations: row.required_integrations || [],
      supportedSystems: row.supported_systems || []
    }))

    return json({ 
      triggers,
      total: triggers.length,
      active: triggers.filter(t => t.active).length
    })

  } catch (error) {
    console.error('Trigger library fetch error:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const method = request.method

  if (method === 'POST') {
    return handleCreate(request, context)
  }

  return json({ error: 'Method not allowed' }, { status: 405 })
}

async function handleCreate(request: Request, context: any) {
  try {
    const body = await request.json() as CreateTriggerTemplateRequest & {
      organizationId: string
      createdBy: string
    }

    const supabase = createClient(
      context.cloudflare.env.SUPABASE_URL,
      context.cloudflare.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Validate required fields
    if (!body.name || !body.description || !body.type || !body.organizationId) {
      return json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert trigger template
    const { data: triggerTemplate, error } = await supabase
      .from('trigger_templates')
      .insert({
        organization_id: body.organizationId,
        name: body.name,
        description: body.description,
        type: body.type,
        category: body.category,
        active: body.active ?? true,
        ai_keywords: body.aiKeywords || [],
        typical_use_cases: body.typicalUseCases || [],
        config_schema: body.configSchema || { properties: {}, required: [] },
        icon: body.icon || '⚡',
        color: body.color || '#3B82F6',
        setup_questions: body.setupQuestions || [],
        required_integrations: body.requiredIntegrations || [],
        supported_systems: body.supportedSystems || [],
        created_by: body.createdBy
      })
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return json({ error: 'Failed to create trigger template' }, { status: 500 })
    }

    return json({ 
      message: 'Trigger template created successfully',
      trigger: triggerTemplate
    })

  } catch (error) {
    console.error('Create trigger error:', error)
    return json({ error: 'Invalid request data' }, { status: 400 })
  }
}