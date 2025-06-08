import React, { useState } from 'react'
import { initializeAzureAD } from '~/lib/auth/azure-ad'
import { useAuth } from '~/components/auth/AuthProvider'

interface AzureADSetupProps {
  onComplete?: () => void
}

export function AzureADSetup({ onComplete }: AzureADSetupProps) {
  const { profile } = useAuth()
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    tenantId: '',
    redirectUri: `${window.location.origin}/auth/azure/callback`
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.organization_id) return

    setLoading(true)
    setError(null)

    try {
      const result = await initializeAzureAD(profile.organization_id, formData)
      
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onComplete?.()
        }, 2000)
      } else {
        setError(result.error || 'Failed to configure Azure AD')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Azure AD Configured Successfully!</h2>
            <p className="text-gray-600">Your organization can now use Microsoft Azure AD for single sign-on.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Configure Azure AD SSO</h1>
          <p className="text-gray-600 mt-2">
            Set up Microsoft Azure Active Directory integration for your organization.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Before you start:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Register WorkflowHub as an application in your Azure AD tenant</li>
            <li>• Set the redirect URI to: <code className="bg-blue-100 px-1 rounded">{formData.redirectUri}</code></li>
            <li>• Grant appropriate API permissions (User.Read, openid, profile, email)</li>
            <li>• Create application groups for role mapping (e.g., WorkflowHub-Builders)</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
              Tenant ID *
            </label>
            <input
              id="tenantId"
              name="tenantId"
              type="text"
              required
              value={formData.tenantId}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <p className="mt-1 text-sm text-gray-500">Found in Azure AD > Properties > Tenant ID</p>
          </div>

          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
              Application (Client) ID *
            </label>
            <input
              id="clientId"
              name="clientId"
              type="text"
              required
              value={formData.clientId}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <p className="mt-1 text-sm text-gray-500">Found in App registrations > Your App > Application ID</p>
          </div>

          <div>
            <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700">
              Client Secret *
            </label>
            <input
              id="clientSecret"
              name="clientSecret"
              type="password"
              required
              value={formData.clientSecret}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your client secret"
            />
            <p className="mt-1 text-sm text-gray-500">Generate in App registrations > Your App > Certificates & secrets</p>
          </div>

          <div>
            <label htmlFor="redirectUri" className="block text-sm font-medium text-gray-700">
              Redirect URI
            </label>
            <input
              id="redirectUri"
              name="redirectUri"
              type="url"
              value={formData.redirectUri}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
            <p className="mt-1 text-sm text-gray-500">This URI must be registered in your Azure AD application</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onComplete}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Configuring...' : 'Configure Azure AD'}
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Role Mapping</h3>
          <p className="text-sm text-gray-600 mb-3">
            Create these Azure AD groups to automatically assign WorkflowHub roles:
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><code className="bg-white px-2 py-1 rounded">WorkflowHub-SystemAdmins</code> → System Admin</div>
            <div><code className="bg-white px-2 py-1 rounded">WorkflowHub-Auditors</code> → Auditor</div>
            <div><code className="bg-white px-2 py-1 rounded">WorkflowHub-Approvers</code> → Approver</div>
            <div><code className="bg-white px-2 py-1 rounded">WorkflowHub-Reviewers</code> → Reviewer</div>
            <div><code className="bg-white px-2 py-1 rounded">WorkflowHub-Builders</code> → Builder</div>
            <div><em className="text-gray-500">No group</em> → Reviewer (default)</div>
          </div>
        </div>
      </div>
    </div>
  )
}