import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Debug logging removed to prevent hydration issues

// Fallback values if environment variables aren't loaded
const fallbackUrl = 'https://xrhjexjgjhdgxzumngpj.supabase.co'
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyaGpleGpnamhkZ3h6dW1uZ3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjEwNzAsImV4cCI6MjA3NDAzNzA3MH0.Ast_hvS8_NGwgAcOuUL_F4voW12ucCXdyjT8AXeXsCw'

// Use environment variables or fallback to hardcoded values
const finalUrl = supabaseUrl || fallbackUrl
const finalKey = supabaseAnonKey || fallbackKey

// Create client with final values
export const supabase = createClient(finalUrl, finalKey)

// For server-side operations that require service role
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = serviceRoleKey
  ? createClient(
      finalUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null
