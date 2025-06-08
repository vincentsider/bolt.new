import React, { useState } from 'react'
import { AzureADProvider } from '~/lib/auth/azure-ad'

interface AzureADButtonProps {
  organizationSlug?: string
  disabled?: boolean
  className?: string
}

export function AzureADButton({ organizationSlug, disabled, className }: AzureADButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAzureADLogin() {
    if (!organizationSlug) {
      setError('Organization not specified')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get organization's Azure AD configuration
      const response = await fetch(`/api/auth/azure-config?org=${organizationSlug}`)
      
      if (!response.ok) {
        throw new Error('Failed to get Azure AD configuration')
      }

      const { config, organizationId } = await response.json()

      if (!config) {
        throw new Error('Azure AD not configured for this organization')
      }

      // Create state parameter with organization info
      const state = btoa(JSON.stringify({ 
        organizationId,
        timestamp: Date.now()
      }))

      // Initialize Azure AD provider
      const azureProvider = new AzureADProvider({
        clientId: config.clientId,
        clientSecret: '', // Not needed for auth URL generation
        tenantId: config.tenantId,
        redirectUri: config.redirectUri
      })

      // Redirect to Azure AD
      const authUrl = azureProvider.getAuthorizationUrl(state)
      window.location.href = authUrl

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Azure AD login')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAzureADLogin}
        disabled={disabled || loading || !organizationSlug}
        className={`
          w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm
          text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className || ''}
        `}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.017 0L5.9 6.094v5.663L12.017 24l6.12-12.243V6.094L12.017 0zm3.036 6.094L12.017 3.049 8.98 6.094v5.663l3.037 6.094 3.036-6.094V6.094z"/>
            <path d="M8.98 11.757V6.094l3.037 3.045 3.036-3.045v5.663l-3.036 3.045-3.037-3.045z" fill="#00BCF2"/>
          </svg>
        )}
        {loading ? 'Connecting...' : 'Sign in with Microsoft'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}