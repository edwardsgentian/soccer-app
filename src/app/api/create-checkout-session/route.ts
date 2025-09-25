import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      console.error('Stripe not configured - missing STRIPE_SECRET_KEY environment variable')
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const requestBody = await request.json()

    // Handle both old format (price, currency) and new format (gameId, gameName, price, etc.)
    const { 
      price, 
      currency = 'usd',
      gameId,
      gameName,
      customerEmail,
      customerName,
      customerPhone
    } = requestBody

    if (!price) {
      console.error('Price is required but not provided')
      return NextResponse.json(
        { error: 'Price is required' },
        { status: 400 }
      )
    }

    if (!customerEmail) {
      console.error('Customer email is required but not provided')
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      )
    }

    // Convert price to cents if it's not already
    // If price is less than 100, assume it's in dollars and convert to cents
    // If price is 100 or more, assume it's already in cents
    const priceInCents = typeof price === 'string' 
      ? (parseFloat(price) < 100 ? Math.round(parseFloat(price) * 100) : Math.round(parseFloat(price)))
      : (price < 100 ? Math.round(price * 100) : price)

    // Check if user has an existing Stripe customer ID
    let customerId: string | undefined
    try {
      const { data: player } = await supabase
        .from('players')
        .select('stripe_customer_id')
        .eq('email', customerEmail)
        .single()

      customerId = player?.stripe_customer_id
    } catch {
      console.log('No existing customer found, will create new one')
    }

    // Create a Checkout Session
    const sessionConfig: {
      payment_method_types: ['card']
      line_items: Array<{
        price_data: {
          currency: string
          product_data: {
            name: string
            description?: string
          }
          unit_amount: number
        }
        quantity: number
      }>
      mode: 'payment'
      success_url: string
      cancel_url: string
      customer?: string
      customer_email?: string
      metadata?: Record<string, string>
    } = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: gameName || 'Soccer Game',
              description: 'Join this exciting soccer game and connect with fellow players in your community',
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cancel`,
      metadata: {
        gameId: gameId || 'test',
        gameName: gameName || 'test-game',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        test: 'true', // Mark as test payment
      },
    }

    // Use existing customer if available, otherwise use customer_email
    if (customerId) {
      sessionConfig.customer = customerId
      console.log('Using existing Stripe customer:', customerId)
    } else {
      sessionConfig.customer_email = customerEmail
      console.log('Creating new customer with email:', customerEmail)
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('Checkout session created:', session.id)
    return NextResponse.json({
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
// Force new deployment - Thu Sep 25 13:47:20 EDT 2025
