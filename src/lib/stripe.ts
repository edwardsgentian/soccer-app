import Stripe from 'stripe'

// Server-side Stripe instance
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY

// Temporary fallback for testing - replace with your actual Stripe secret key
const fallbackKey = 'sk_test_51S9nduBI4qRcQSVOYBhuFPjf8jbfoLObzlsLw1nX065W2aO5SZ2IAWNUW2WNAeRi90m9YIfRp5PWOnkwcpatSJXl00zWB11HJs'

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : fallbackKey
  ? new Stripe(fallbackKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null

// Client-side Stripe instance
export const getStripe = async () => {
  if (typeof window !== 'undefined') {
    const { loadStripe } = await import('@stripe/stripe-js')
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51S9nduBI4qRcQSVOhFEZxPSKX4m2Z0ruJpTPLrdKhQ8YoyJ3ZTOjO3YuihUFboFM1HC4XhR2dE95yXXXnKQgw5kb00YIcCXDOa'
    return loadStripe(publishableKey)
  }
  return null
}
