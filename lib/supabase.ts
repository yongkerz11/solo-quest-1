import { createBrowserClient } from '@supabase/ssr'

export const DEFAULT_SUPABASE_URL = 'https://aihhuzblhnmxcfvcyryn.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_xPzUbU2tU1SxVuqR9dL15Q_rS8AYh80'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('placeholder')
)

// Gunakan createBrowserClient agar cookie sesi tersinkronisasi otomatis dengan Next.js Server Components & Middleware
export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null

