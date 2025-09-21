'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      if (!supabase) {
        setConnectionStatus('error')
        setError('Supabase client not initialized')
        return
      }

      try {
        // Test connection by getting the current user (this works even with RLS)
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          // If we get an error, it might be due to RLS or auth settings
          // Let's try a different approach - test the connection itself
          const { data, error: healthError } = await supabase
            .from('_supabase_migrations')
            .select('*')
            .limit(1)
            .maybeSingle()
          
          if (healthError && healthError.code === 'PGRST116') {
            // Table doesn't exist but connection is working
            setConnectionStatus('connected')
          } else if (healthError && healthError.message.includes('JWT')) {
            // JWT/auth error - connection works but needs auth
            setConnectionStatus('connected')
          } else {
            throw healthError
          }
        } else {
          setConnectionStatus('connected')
        }
      } catch (err) {
        setConnectionStatus('error')
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="font-semibold text-card-foreground mb-2">Supabase Connection Test</h3>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' : 
          connectionStatus === 'error' ? 'bg-red-500' : 
          'bg-yellow-500 animate-pulse'
        }`} />
        <span className="text-sm text-muted-foreground">
          {connectionStatus === 'connected' && 'Connected to Supabase ✅'}
          {connectionStatus === 'error' && `Error: ${error}`}
          {connectionStatus === 'testing' && 'Testing connection...'}
        </span>
      </div>
    </div>
  )
}
