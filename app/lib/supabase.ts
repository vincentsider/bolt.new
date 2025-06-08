import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://eyjhpaaumnvwwlwrotgg.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5amhwYWF1bW52d3dsd3JvdGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzY3NzYsImV4cCI6MjA2NDg1Mjc3Nn0.dwCixK3vhobT9SkzV-lVjHSla_6yZFcdQPkuXswBais'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1)
    if (error) {
      console.log('Database not ready yet:', error.message)
      return false
    }
    console.log('✅ Supabase connection successful')
    return true
  } catch (err) {
    console.log('❌ Supabase connection failed:', err)
    return false
  }
}