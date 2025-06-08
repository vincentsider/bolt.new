import React from 'react'
import { useNavigate } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'

export default function Dashboard() {
  const { user, profile, organization, loading, signOut } = useAuth()
  const navigate = useNavigate()

  // Redirect to auth if not logged in
  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null // Will redirect to auth
  }

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">WorkflowHub</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {profile.profile.name} ({profile.role})
              </span>
              {organization && (
                <span className="text-sm text-gray-500">
                  @ {organization.name}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to WorkflowHub! 🎉
                </h2>
                <p className="text-gray-600 mb-6">
                  Your no-code workflow automation platform is ready.
                </p>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Setup Complete</h3>
                  <ul className="text-sm text-green-700 space-y-1 text-left">
                    <li>• Database schema deployed</li>
                    <li>• Authentication working</li>
                    <li>• User profile created</li>
                    <li>• Organization: {organization?.name}</li>
                    <li>• Role: {profile.role}</li>
                  </ul>
                </div>

                <div className="mt-6 space-x-4">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    Create Workflow
                  </button>
                  <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md text-sm font-medium">
                    View Templates
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}