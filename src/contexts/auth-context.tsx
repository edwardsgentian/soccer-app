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
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>
  restoreAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPlayer = async () => {
    if (!supabase) return

    try {
      // Check if user is logged in via localStorage (custom auth system)
      const storedUser = localStorage.getItem('soccer_app_user')
      const storedPlayer = localStorage.getItem('soccer_app_player')
      
      if (storedUser && storedPlayer) {
        const user = JSON.parse(storedUser)
        const player = JSON.parse(storedPlayer)
        setUser(user)
        setPlayer(player)
        return
      }

      // Fallback: try Supabase auth (for compatibility)
      const { data: authUser } = await supabase.auth.getUser()
      if (!authUser.user?.email) {
        return
      }
      
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('email', authUser.user.email)
        .single()

      if (error) {
        console.error('Error fetching player:', error)
        return
      }

      setPlayer(data)
    } catch (err) {
      console.error('Error fetching player:', err)
      // Don't throw here - just log the error and continue
    }
  }

  const refreshPlayer = async () => {
    if (user) {
      await fetchPlayer()
    }
  }

  const restoreAuth = async () => {
    console.log('Attempting to restore authentication from localStorage...')
    try {
      const storedUser = localStorage.getItem('soccer_app_user')
      const storedPlayer = localStorage.getItem('soccer_app_player')
      
      if (storedUser && storedPlayer) {
        const user = JSON.parse(storedUser)
        const player = JSON.parse(storedPlayer)
        setUser(user)
        setPlayer(player)
        console.log('Authentication restored successfully:', { user: !!user, player: !!player })
        return true
      } else {
        console.log('No stored authentication data found')
        return false
      }
    } catch (error) {
      console.error('Error restoring authentication:', error)
      return false
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session - try custom auth first, then Supabase fallback
    const getInitialSession = async () => {
      // First try to restore from localStorage (our custom auth system)
      const restored = await restoreAuth()
      
      if (!restored) {
        // Fallback to Supabase auth
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchPlayer()
        }
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes (but don't override custom auth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only update if we don't have custom auth data
        const hasCustomAuth = localStorage.getItem('soccer_app_user') && localStorage.getItem('soccer_app_player')
        
        if (!hasCustomAuth) {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await fetchPlayer()
          } else {
            setPlayer(null)
          }
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (!supabase) return

    // Clear localStorage
    localStorage.removeItem('soccer_app_user')
    localStorage.removeItem('soccer_app_player')
    
    // Clear state
    setUser(null)
    setPlayer(null)

    // Try Supabase signOut for compatibility
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const login = async (email: string, password: string) => {
    console.log('Login attempt for email:', email)
    if (!supabase) throw new Error('Supabase not initialized')

    try {
      console.log('Querying players table...')
      
      // Add timeout to prevent hanging
      const queryPromise = supabase
        .from('players')
        .select('*')
        .eq('email', email)
        .single()

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login request timed out')), 10000)
      )

      const result = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as { data: { id: string; email: string; password_hash: string; name: string; photo_url?: string } | null; error: { message: string; code?: string } | null }
      const { data: playerData, error: playerError } = result

      console.log('Player query result:', { playerData, playerError })

      if (playerError) {
        console.error('Login error:', playerError)
        if (playerError.code === 'PGRST116') {
          // Not found - invalid email
          console.log('User not found in database for email:', email)
          throw new Error('Invalid email or password')
        } else {
          throw new Error('Login failed. Please try again.')
        }
      }

      if (!playerData) {
        console.log('No player data returned for email:', email)
        throw new Error('Invalid email or password')
      }

      console.log('User found:', {
        id: playerData.id,
        email: playerData.email,
        name: playerData.name,
        hasPasswordHash: !!playerData.password_hash
      })

      // Check password (handle both plain text and base64 encoded passwords)
      const hashedPassword = btoa(password)
      const isPlainTextMatch = playerData.password_hash === password
      const isHashedMatch = playerData.password_hash === hashedPassword
      
      console.log('Password check:', {
        providedPassword: password,
        hashedProvided: hashedPassword,
        storedHash: playerData.password_hash,
        isPlainTextMatch,
        isHashedMatch,
        finalMatch: isPlainTextMatch || isHashedMatch
      })
      
      if (!isPlainTextMatch && !isHashedMatch) {
        console.log('Password mismatch for user:', email)
        throw new Error('Invalid email or password')
      }

      // Create a mock user object for the auth context
      const mockUser = {
        id: playerData.id,
        email: playerData.email,
        user_metadata: {
          name: playerData.name
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as User

      // Store in localStorage for persistence
      localStorage.setItem('soccer_app_user', JSON.stringify(mockUser))
      localStorage.setItem('soccer_app_player', JSON.stringify(playerData))

        setUser(mockUser as unknown as User)
      setPlayer(playerData)
    } catch (error) {
      throw error
    }
  }

  const signup = async (name: string, email: string, phone: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized')

    try {
      // Check if email already exists
      const { data: existingPlayer, error: checkError } = await supabase
        .from('players')
        .select('id')
        .eq('email', email)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected for new emails
        console.error('Error checking existing email:', checkError)
        throw new Error('Failed to check if email exists')
      }

      if (existingPlayer) {
        throw new Error('An account with this email already exists')
      }

      // Hash password
      const hashedPassword = btoa(password)

      // Create new player
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert({
          name,
          email,
          phone,
          password_hash: hashedPassword,
          member_since: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('Signup error:', insertError)
        throw new Error(`Failed to create account: ${insertError.message}`)
      }

      // Create a mock user object for the auth context
      const mockUser = {
        id: newPlayer.id,
        email: newPlayer.email,
        user_metadata: {
          name: newPlayer.name
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as User

      // Store in localStorage for persistence
      localStorage.setItem('soccer_app_user', JSON.stringify(mockUser))
      localStorage.setItem('soccer_app_player', JSON.stringify(newPlayer))

        setUser(mockUser as unknown as User)
      setPlayer(newPlayer)
    } catch (error) {
      throw error
    }
  }

  const value = {
    user,
    player,
    loading,
    signOut,
    refreshPlayer,
    login,
    signup,
    restoreAuth,
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
