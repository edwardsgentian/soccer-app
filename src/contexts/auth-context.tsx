'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Player {
  id: string
  name: string
  email: string
  phone?: string
  instagram?: string
  photo_url?: string
  member_since: string
  playing_experience?: string
  skill_level?: string
  favorite_team?: string
  favorite_player?: string
  other_sports?: string
  languages?: string[]
  home_location?: string
  time_in_nyc?: string
}

interface AuthContextType {
  user: User | null
  player: Player | null
  loading: boolean
  signOut: () => Promise<void>
  refreshPlayer: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPlayer = async (userEmail: string) => {
    if (!supabase || !userEmail) return

    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('email', userEmail)
        .single()

      if (error) {
        console.error('Error fetching player:', error)
        return
      }

      setPlayer(data as Player | null)
    } catch (err) {
      console.error('Error fetching player:', err)
      // Don't throw here - just log the error and continue
    }
  }

  const refreshPlayer = async () => {
    if (user && user.email) {
      await fetchPlayer(user.email)
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user?.email) {
        await fetchPlayer(session.user.email)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user?.email) {
          await fetchPlayer(session.user.email)
        } else {
          setPlayer(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (!supabase) return

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const value = {
    user,
    player,
    loading,
    signOut,
    refreshPlayer,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
