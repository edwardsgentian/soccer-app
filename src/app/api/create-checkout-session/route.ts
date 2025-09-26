import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Stripe secret key not configured')
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { 
      gameId, 
      seasonId, 
      price, 
      playerName, 
      playerEmail, 
      playerPhone,
      playerId,
      discountCode
    } = body

    console.log('Creating checkout session for:', { gameId, seasonId, price, playerId, playerEmail, discountCode })

    if (!gameId && !seasonId) {
      return NextResponse.json({ error: 'Game ID or Season ID is required' }, { status: 400 })
    }

    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
    }

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    if (!playerEmail) {
      return NextResponse.json({ error: 'Player email is required' }, { status: 400 })
    }

    // Create Stripe checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: gameId ? 'Soccer Game' : 'Soccer Season',
              description: gameId 
                ? `Join the soccer game` 
                : `Join the soccer season`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/games${gameId ? `/${gameId}` : ''}`,
      customer_email: playerEmail,
      metadata: {
        gameId: gameId || '',
        seasonId: seasonId || '',
        playerId: playerId || '',
        playerName: playerName || '',
        playerPhone: playerPhone || '',
        discountCode: discountCode || '',
      },
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('Stripe session created:', session.id)
    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    )
  }
}
