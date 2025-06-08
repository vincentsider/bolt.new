import React, { useState } from 'react'
import { useNavigate } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'
import { LoginForm } from '~/components/auth/LoginForm'
import { SignupForm } from '~/components/auth/SignupForm'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const navigate = useNavigate()
  const { user } = useAuth()

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  function handleAuthSuccess() {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">WorkflowHub</h2>
          <p className="mt-2 text-sm text-gray-600">
            No-code workflow automation for financial services
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignup={() => setMode('signup')}
          />
        ) : (
          <SignupForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}