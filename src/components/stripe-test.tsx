'use client'

import { useEffect, useState } from 'react'
import { getStripe } from '@/lib/stripe'
import { Button } from '@/components/ui/button'

export function StripeTest() {
  const [stripeStatus, setStripeStatus] = useState<'testing' | 'ready' | 'error'>('testing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testStripe = async () => {
      try {
        const stripe = await getStripe()
        if (stripe) {
          setStripeStatus('ready')
        } else {
          setStripeStatus('error')
          setError('Stripe client not initialized')
        }
      } catch (err) {
        setStripeStatus('error')
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    testStripe()
  }, [])

  const handleTestPayment = async () => {
    try {
      const stripe = await getStripe()
      if (!stripe) {
        alert('Stripe not initialized')
        return
      }

      // Create a test checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: 2000, // $20.00 in cents
          currency: 'usd',
        }),
      })

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (error) {
        alert(`Error: ${error.message}`)
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="font-semibold text-card-foreground mb-2">Stripe Integration Test</h3>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${
          stripeStatus === 'ready' ? 'bg-green-500' : 
          stripeStatus === 'error' ? 'bg-red-500' : 
          'bg-yellow-500 animate-pulse'
        }`} />
        <span className="text-sm text-muted-foreground">
          {stripeStatus === 'ready' && 'Stripe Ready ✅'}
          {stripeStatus === 'error' && `Error: ${error}`}
          {stripeStatus === 'testing' && 'Testing Stripe...'}
        </span>
      </div>
      
      {stripeStatus === 'ready' && (
        <Button 
          onClick={handleTestPayment}
          variant="outline"
          size="sm"
        >
          Test Payment ($20.00)
        </Button>
      )}
    </div>
  )
}
