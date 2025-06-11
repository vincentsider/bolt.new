import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

// Server-side Supabase client
export function getSupabaseServer(context?: any) {
  let supabaseUrl: string | undefined
  let supabaseServiceKey: string | undefined

  // In Cloudflare Workers, use context.cloudflare.env
  if (context?.cloudflare?.env) {
    supabaseUrl = context.cloudflare.env.SUPABASE_URL
    // Use anon key for now since service role key is invalid
    supabaseServiceKey = context.cloudflare.env.SUPABASE_ANON_KEY
  } else {
    // Fallback to process.env for local development
    supabaseUrl = process.env.SUPABASE_URL || 'https://eyjhpaaumnvwwlwrotgg.supabase.co'
    // Use anon key for now since service role key is invalid
    supabaseServiceKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5amhwYWF1bW52d3dsd3JvdGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzY3NzYsImV4cCI6MjA2NDg1Mjc3Nn0.dwCixK3vhobT9SkzV-lVjHSla_6yZFcdQPkuXswBais'
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}