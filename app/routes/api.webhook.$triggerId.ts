import { type ActionFunctionArgs, json } from '@remix-run/cloudflare'
import { TriggerEngine } from '~/lib/workflow/trigger-engine'

export async function action({ params, request, context }: ActionFunctionArgs) {
  const { triggerId } = params
  
  if (!triggerId) {
    return json({ error: 'Trigger ID is required' }, { status: 400 })
  }
  
  const method = request.method
  const headers: Record<string, string> = {}
  
  // Extract headers
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })
  
  let body: any = null
  
  // Parse body based on content type
  const contentType = headers['content-type'] || ''
  
  try {
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      body = Object.fromEntries(formData)
    } else {
      body = await request.text()
    }
  } catch (error) {
    console.error('Failed to parse webhook body:', error)
    body = null
  }
  
  try {
    // Initialize trigger engine
    const engine = new TriggerEngine(
      'webhook-org', // Would get from trigger in real implementation
      context.cloudflare.env.SUPABASE_URL,
      context.cloudflare.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Process webhook
    const result = await engine.processWebhook(triggerId, method, headers, body)
    
    if (result.success) {
      return json({ 
        success: true, 
        message: result.message,
        timestamp: new Date().toISOString()
      })
    } else {
      return json({ 
        error: result.message 
      }, { 
        status: 400 
      })
    }
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return json({ 
      error: 'Internal server error' 
    }, { 
      status: 500 
    })
  }
}

// Also handle GET requests for webhook testing
export async function loader({ params }: ActionFunctionArgs) {
  const { triggerId } = params
  
  return json({
    message: 'Webhook endpoint is active',
    triggerId,
    method: 'GET',
    timestamp: new Date().toISOString(),
    usage: 'Send a POST request with your webhook data to trigger the workflow'
  })
}