import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True when both env vars are present. The app renders a setup guide instead
 * of crashing when credentials are missing, so the UI can always be previewed.
 */
export const isSupabaseConfigured: boolean = Boolean(url && anonKey)

/**
 * Single shared Supabase client. Only created when configured; every consumer
 * goes through AuthContext, which checks `isSupabaseConfigured` first.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
