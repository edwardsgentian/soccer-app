import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // Create Stripe customer
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const customer = await stripe.customers.create({
      email,
      name,
      phone: phone || undefined,
      metadata: {
        source: 'soccer_app'
      }
    })

    // Update player record with Stripe customer ID
    const { error: updateError } = await supabase
      .from('players')
      .update({ stripe_customer_id: customer.id })
      .eq('email', email)

    if (updateError) {
      console.error('Error updating player with Stripe customer ID:', updateError)
      // Don't fail the request if we can't update the database
      // The customer was created successfully in Stripe
    }

    return NextResponse.json({
      success: true,
      customer_id: customer.id
    })

  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}

