import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha cedo se as variáveis nunca foram setadas (não conta os defaults antigos)
  console.error('[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes no .env')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'adp_supabase_auth',
  },
})

export const APP_GROUP_ID = '00000000-0000-0000-0000-000000000001'
export const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000010'
