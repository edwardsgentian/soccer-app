'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        // Check for URL error parameters first
        if (error) {
          if (error === 'access_denied' && errorDescription?.includes('expired')) {
            setError('Your email confirmation link has expired. Please try signing up again.')
          } else if (error === 'access_denied') {
            setError('Email confirmation link is invalid. Please try signing up again.')
          } else {
            setError(`Email confirmation failed: ${errorDescription || error}`)
          }
          setLoading(false)
          return
        }
        
        if (code) {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Auth callback error:', error)
            if (error.message.includes('expired') || error.message.includes('invalid')) {
              setError('Your email confirmation link has expired or is invalid. Please try signing up again.')
            } else {
              setError('Failed to confirm email. Please try again.')
            }
            return
          }

          if (data.user) {
            // Create player profile if it doesn't exist
            const { data: existingPlayer } = await supabase
              .from('players')
              .select('id')
              .eq('id', data.user.id)
              .single()

            if (!existingPlayer) {
              // Create player profile with data from signup
              const { error: profileError } = await supabase
                .from('players')
                .insert({
                  id: data.user.id,
                  name: data.user.user_metadata?.name || '',
                  email: data.user.email || '',
                  phone: data.user.user_metadata?.phone || '',
                })

              if (profileError) {
                console.error('Error creating player profile:', profileError)
                // Don't throw - user is confirmed, profile can be updated later
              }
            }

            // Redirect to success page or home
            router.push('/?confirmed=true')
          }
        } else {
          setError('No confirmation code found.')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('An error occurred during email confirmation.')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Confirming your email...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Email Confirmation Failed
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {error}
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push('/')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium mr-4"
              >
                Return to Home
              </button>
              <button
                onClick={() => router.push('/?signup=true')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Try Signing Up Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
