import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { createClient } from '@supabase/supabase-js'
import type { TriggerStats, TriggerType, TriggerCategory } from '~/types/trigger-library'

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organization_id')
  
  if (!organizationId) {
    return json({ error: 'Organization ID is required' }, { status: 400 })
  }

  const supabase = createClient(
    context.cloudflare.env.SUPABASE_URL,
    context.cloudflare.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Get trigger template stats
    const { data: templates, error: templatesError } = await supabase
      .from('trigger_templates')
      .select('type, category, active')
      .eq('organization_id', organizationId)

    if (templatesError) {
      console.error('Templates stats error:', templatesError)
      return json({ error: 'Failed to fetch template stats' }, { status: 500 })
    }

    // Get trigger event stats
    const { data: events, error: eventsError } = await supabase
      .from('trigger_events')
      .select('processed, processing_time_ms')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (eventsError) {
      console.error('Events stats error:', eventsError)
      // Continue without event stats
    }

    // Calculate trigger type and category counts
    const triggersByType: Record<TriggerType, number> = {
      manual: 0,
      scheduled: 0,
      email_received: 0,
      file_added: 0,
      record_created: 0,
      record_updated: 0,
      webhook: 0,
      condition_met: 0
    }

    const triggersByCategory: Record<TriggerCategory, number> = {
      user_initiated: 0,
      time_based: 0,
      event_based: 0,
      system_based: 0
    }

    let activeTriggers = 0

    templates?.forEach(template => {
      triggersByType[template.type] = (triggersByType[template.type] || 0) + 1
      triggersByCategory[template.category] = (triggersByCategory[template.category] || 0) + 1
      if (template.active) activeTriggers++
    })

    // Calculate event stats
    const totalEvents = events?.length || 0
    const successfulEvents = events?.filter(e => e.processed).length || 0
    const failedEvents = totalEvents - successfulEvents

    const processingTimes = events?.filter(e => e.processing_time_ms).map(e => e.processing_time_ms) || []
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0

    const stats: TriggerStats = {
      totalTriggers: templates?.length || 0,
      activeTriggers,
      triggersByType,
      triggersByCategory,
      totalEvents,
      successfulEvents,
      failedEvents,
      averageProcessingTime,
      lastUpdated: new Date().toISOString()
    }

    return json({ stats })

  } catch (error) {
    console.error('Trigger stats error:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}