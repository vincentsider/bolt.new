import type { LoaderFunctionArgs } from '@remix-run/node'
import pkg from '@remix-run/node';
const { json } = pkg;
import { supabase } from '~/lib/supabase'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const orgSlug = url.searchParams.get('org')

  if (!orgSlug) {
    return json({ error: 'Organization slug required' }, { status: 400 })
  }

  try {
    // Get organization by slug
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, settings')
      .eq('slug', orgSlug)
      .single()

    if (orgError || !org) {
      return json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if Azure AD is configured
    const azureConfig = org.settings?.azureAD

    if (!azureConfig) {
      return json({ 
        config: null, 
        organizationId: org.id,
        message: 'Azure AD not configured for this organization' 
      })
    }

    // Return public configuration (no secrets)
    return json({
      config: {
        clientId: azureConfig.clientId,
        tenantId: azureConfig.tenantId,
        redirectUri: azureConfig.redirectUri
      },
      organizationId: org.id
    })

  } catch (error) {
    console.error('Error getting Azure AD config:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}