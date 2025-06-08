import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from '@remix-run/react'
import { AzureADProvider, signInWithAzureAD } from '~/lib/auth/azure-ad'
import { supabase } from '~/lib/supabase'

export default function AzureADCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        throw new Error(`Azure AD error: ${searchParams.get('error_description') || error}`)
      }

      if (!code) {
        throw new Error('No authorization code received')
      }

      // Parse state to get organization info
      const stateData = state ? JSON.parse(atob(state)) : null
      const organizationId = stateData?.organizationId

      if (!organizationId) {
        throw new Error('Invalid state - organization ID missing')
      }

      // Get organization's Azure AD configuration
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single()

      if (orgError || !org?.settings?.azureAD) {
        throw new Error('Organization Azure AD not configured')
      }

      const azureConfig = org.settings.azureAD
      
      // Initialize Azure AD provider
      const azureProvider = new AzureADProvider({
        clientId: azureConfig.clientId,
        clientSecret: process.env.AZURE_CLIENT_SECRET || '', // From environment
        tenantId: azureConfig.tenantId,
        redirectUri: azureConfig.redirectUri
      })

      // Sign in user
      const result = await signInWithAzureAD(code, organizationId, azureProvider)

      if (result.error) {
        throw new Error(result.error)
      }

      setStatus('success')
      
      // Redirect to main app after short delay
      setTimeout(() => {
        navigate('/')
      }, 2000)

    } catch (err) {
      console.error('Azure AD callback error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing you in...</h2>
              <p className="text-gray-600">Please wait while we complete your Azure AD authentication.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to WorkflowHub!</h2>
              <p className="text-gray-600">You have been successfully signed in. Redirecting...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Return to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}