import React, { useState } from 'react'
import { useAuth } from './AuthProvider'
import { AzureADButton } from './AzureADButton'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToSignup?: () => void
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgSlug, setOrgSlug] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onSuccess?.()
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sign in to WorkflowHub</h1>
          <p className="text-gray-600 mt-2">Welcome back! Please sign in to your account.</p>
        </div>

        {/* Enterprise SSO Section */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <div className="px-4 text-sm text-gray-500">Enterprise Sign-In</div>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700">
                Organization
              </label>
              <input
                id="orgSlug"
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your-company"
              />
            </div>
            
            <AzureADButton 
              organizationSlug={orgSlug}
              disabled={!orgSlug.trim()}
            />
          </div>
        </div>

        <div className="flex items-center mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <div className="px-4 text-sm text-gray-500">Or sign in with email</div>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToSignup}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </div>
  )
}