'use client'

import { loadStripe } from '@stripe/stripe-js'
import { useEffect, useState } from 'react'

export const useStripe = () => {
  const [stripePromise, setStripePromise] = useState<Promise<import('@stripe/stripe-js').Stripe | null> | null>(null)

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey))
    }
  }, [])

  return stripePromise
}

