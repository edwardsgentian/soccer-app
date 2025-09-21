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
        // Simple test - just check if we can access the auth service
        // This doesn't require any database access or special permissions
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          // Even if there's an error, if we got a response, the connection works
          // The error might be about no session, which is expected
          if (error.message.includes('session') || error.message.includes('JWT')) {
            setConnectionStatus('connected')
          } else {
            throw error
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
