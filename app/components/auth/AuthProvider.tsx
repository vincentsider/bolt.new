import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '~/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User, Organization } from '~/types/database'

interface AuthContextType {
  user: SupabaseUser | null
  profile: User | null
  organization: Organization | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string, name: string, organizationName: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User['profile']>) => Promise<{ error?: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setProfile(null)
          setOrganization(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserProfile(userId: string) {
    try {
      // Load user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('Error loading user profile:', userError)
        setLoading(false)
        return
      }

      setProfile(userProfile)

      // Load organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userProfile.organization_id)
        .single()

      if (orgError) {
        console.error('Error loading organization:', orgError)
      } else {
        setOrganization(org)
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)

    } catch (error) {
      console.error('Error in loadUserProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      return { error }
    } catch (error) {
      return { error }
    }
  }

  async function signUp(email: string, password: string, name: string, organizationName: string) {
    try {
      // Generate organization slug
      const orgSlug = organizationName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')

      // Create organization first
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          slug: orgSlug + '-' + Math.floor(Math.random() * 1000),
          plan: 'starter'
        })
        .select()
        .single()

      if (orgError) {
        return { error: orgError }
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            organization_id: org.id
          }
        }
      })

      if (authError) {
        // Clean up organization if user creation failed
        await supabase.from('organizations').delete().eq('id', org.id)
        return { error: authError }
      }

      // Create user profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            organization_id: org.id,
            email: email,
            role: 'sysadmin', // First user is sysadmin
            profile: { name }
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          // Don't return error here as auth user is created successfully
        }
      }

      return { error: null }
    } catch (error) {
      console.error('Signup error:', error)
      return { error }
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  async function updateProfile(updates: Partial<User['profile']>) {
    if (!user || !profile) {
      return { error: new Error('No user logged in') }
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          profile: { ...profile.profile, ...updates }
        })
        .eq('id', user.id)

      if (!error) {
        setProfile({
          ...profile,
          profile: { ...profile.profile, ...updates }
        })
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    profile,
    organization,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}