'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false)

  const testPayment = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: 'test-game-123',
          gameName: 'Test Soccer Game',
          price: 20, // $20.00
          customerEmail: 'test@example.com',
          customerName: 'Test User',
          customerPhone: '555-1234',
        }),
      })

      const { sessionId } = await response.json()
      
      if (sessionId) {
        // Redirect to Stripe Checkout
        const stripe = await import('@stripe/stripe-js').then(({ loadStripe }) => 
          loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51S9nduBI4qRcQSVOhFEZxPSKX4m2Z0ruJpTPLrdKhQ8YoyJ3ZTOjO3YuihUFboFM1HC4XhR2dE95yXXXnKQgw5kb00YIcCXDOa')
        )
        
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId })
        }
      }
    } catch (error) {
      console.error('Payment test error:', error)
      alert('Payment test failed. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Test Payment Flow
        </h1>
        
        <div className="space-y-4">
          <p className="text-gray-600 text-center">
            Click the button below to test the complete payment flow:
          </p>
          
          <Button 
            onClick={testPayment}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Test Payment ($20.00)'}
          </Button>
          
          <div className="text-sm text-gray-500 text-center">
            <p>This will:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Create a Stripe checkout session</li>
              <li>Redirect to Stripe checkout</li>
              <li>After payment, redirect to home page</li>
              <li>Show success message</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
