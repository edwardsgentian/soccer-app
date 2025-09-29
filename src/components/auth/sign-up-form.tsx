'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface SignUpFormProps {
  onSuccess?: () => void
  onSwitchToSignIn?: () => void
  prefillData?: {
    name?: string
    email?: string
    phone?: string
  }
}

export function SignUpForm({ onSuccess, onSwitchToSignIn, prefillData }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    name: prefillData?.name || '',
    email: prefillData?.email || '',
    phone: prefillData?.phone || '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name,
            phone: formData.phone,
          }
        }
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Check if email confirmation is required
        if (authData.user.email_confirmed_at === null) {
          // Email confirmation required - show success message
          setError(null)
          // Show a more user-friendly message instead of alert
          setError('✅ Account created! Please check your email and click the confirmation link to complete your registration.')
          // Don't close the modal immediately, let user see the message
          setTimeout(() => {
            onSuccess?.()
          }, 3000)
          return
        }

        // Email already confirmed - create player profile
        const { error: profileError } = await supabase
          .from('players')
          .insert({
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          })

        if (profileError) {
          console.error('Error creating player profile:', profileError)
          // Don&apos;t throw here - user is created, profile can be updated later
        } else {
          // Create Stripe customer for the new user
          try {
            const response = await fetch('/api/create-stripe-customer', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: formData.email,
                name: formData.name,
                phone: formData.phone,
              }),
            })

            if (!response.ok) {
              console.error('Failed to create Stripe customer')
              // Don't fail the signup if Stripe customer creation fails
            }
          } catch (stripeError) {
            console.error('Error creating Stripe customer:', stripeError)
            // Don't fail the signup if Stripe customer creation fails
          }
        }
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Create Account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Create a password (min 6 characters)"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Confirm your password"
            />
          </div>

          {error && (
            <div className={`text-sm p-3 rounded-md ${
              error.startsWith('✅') 
                ? 'text-green-600 bg-green-50' 
                : 'text-red-600 bg-red-50'
            }`}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToSignIn}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}
