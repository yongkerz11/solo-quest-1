import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = 'https://aihhuzblhnmxcfvcyryn.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_xPzUbU2tU1SxVuqR9dL15Q_rS8AYh80'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}


