import { useState } from 'react'
import pkg from '@remix-run/node';
const { json } = pkg;
import type { MetaFunction } from '@remix-run/node'
import { ClientOnly } from 'remix-utils/client-only'
import { BaseChat } from '~/components/chat/BaseChat'
import { Chat } from '~/components/chat/Chat.client'
import { Header } from '~/components/header/Header'
import { useAuth } from '~/components/auth/AuthProvider'
import { LoginForm } from '~/components/auth/LoginForm'
import { SignupForm } from '~/components/auth/SignupForm'

export const meta: MetaFunction = () => {
  return [{ title: 'WorkflowHub' }, { name: 'description', content: 'Talk with WorkflowHub, an AI assistant for creating workflows' }];
};

export const loader = () => json({});

export default function Index() {
  const { user, loading } = useAuth()
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          {authMode === 'login' ? (
            <LoginForm
              onSuccess={() => window.location.reload()}
              onSwitchToSignup={() => setAuthMode('signup')}
            />
          ) : (
            <SignupForm
              onSuccess={() => window.location.reload()}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  )
}
