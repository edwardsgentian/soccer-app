import Stripe from 'stripe'

// Server-side Stripe instance
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    })
  : null

// Client-side Stripe instance
export const getStripe = async () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    const { loadStripe } = await import('@stripe/stripe-js')
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return null
}
