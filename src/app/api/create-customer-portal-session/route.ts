import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Get player's Stripe customer ID
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('stripe_customer_id')
      .eq('email', email)
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    if (!player.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please make a purchase first.' },
        { status: 400 }
      )
    }

    // Create customer portal session
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: player.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile`,
    })

    return NextResponse.json({
      url: portalSession.url
    })

  } catch (error) {
    console.error('Error creating customer portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}

