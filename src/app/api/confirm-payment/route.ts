import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    console.log('Confirming payment for session:', sessionId)

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Extract game information from session metadata
    const { gameId, gameName, customerName, customerEmail, customerPhone } = session.metadata || {}
    console.log('Session metadata:', { gameId, gameName, customerName, customerEmail, customerPhone })
    console.log('Session customer_email:', session.customer_email)

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID not found in session' },
        { status: 400 }
      )
    }

    // Use customer email from session metadata or from session.customer_email
    const finalCustomerEmail = customerEmail || session.customer_email
    console.log('Final customer email:', finalCustomerEmail)

    // Check if user exists, if not create a guest player record
    let playerId: string

    if (finalCustomerEmail) {
      // Try to find existing player by email
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('email', finalCustomerEmail)
        .single()

      if (existingPlayer) {
        playerId = existingPlayer.id
      } else {
        // Create a new player record for the guest
        const { data: newPlayer, error: playerError } = await supabase
          .from('players')
          .insert({
            name: customerName || 'Guest Player',
            email: finalCustomerEmail,
            phone: customerPhone || null,
          })
          .select('id')
          .single()

        if (playerError) {
          console.error('Error creating player:', playerError)
          return NextResponse.json(
            { error: 'Failed to create player record' },
            { status: 500 }
          )
        }

        playerId = newPlayer.id

        // Create Stripe customer for the guest user
        try {
          const customer = await stripe.customers.create({
            email: finalCustomerEmail,
            name: customerName || 'Guest Player',
            phone: customerPhone || undefined,
            metadata: {
              source: 'soccer_app_guest'
            }
          })

          // Update the player record with Stripe customer ID
          await supabase
            .from('players')
            .update({ stripe_customer_id: customer.id })
            .eq('id', playerId)
        } catch (stripeError) {
          console.error('Error creating Stripe customer for guest:', stripeError)
          // Don't fail the payment confirmation if Stripe customer creation fails
        }
      }
    } else {
      console.error('No customer email found in session metadata or customer_email field')
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      )
    }

    // Check if attendance already exists
    const { data: existingAttendance } = await supabase
      .from('game_attendees')
      .select('id')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .single()

    if (existingAttendance) {
      // Update existing record to completed
      const { error: updateError } = await supabase
        .from('game_attendees')
        .update({
          payment_status: 'completed',
          amount_paid: session.amount_total ? session.amount_total / 100 : 0,
        })
        .eq('id', existingAttendance.id)

      if (updateError) {
        console.error('Error updating attendance:', updateError)
        return NextResponse.json(
          { error: 'Failed to update attendance record' },
          { status: 500 }
        )
      }
    } else {
      // Create new attendance record
      const { error: attendanceError } = await supabase
        .from('game_attendees')
        .insert({
          game_id: gameId,
          player_id: playerId,
          payment_intent_id: session.payment_intent as string,
          payment_status: 'completed',
          amount_paid: session.amount_total ? session.amount_total / 100 : 0,
        })

      if (attendanceError) {
        console.error('Error creating attendance:', attendanceError)
        return NextResponse.json(
          { error: 'Failed to create attendance record' },
          { status: 500 }
        )
      }
    }

    // Update game's available tickets count based on actual completed attendees
    const { data: completedAttendees, error: attendeesError } = await supabase
      .from('game_attendees')
      .select('id')
      .eq('game_id', gameId)
      .eq('payment_status', 'completed')

    if (!attendeesError && completedAttendees) {
      const { data: gameData, error: gameFetchError } = await supabase
        .from('games')
        .select('total_tickets')
        .eq('id', gameId)
        .single()

      if (!gameFetchError && gameData) {
        const actualAttendees = completedAttendees.length
        const newAvailableTickets = gameData.total_tickets - actualAttendees

        const { error: gameUpdateError } = await supabase
          .from('games')
          .update({ 
            available_tickets: newAvailableTickets,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId)

        if (gameUpdateError) {
          console.error('Error updating game tickets:', gameUpdateError)
          // Don't fail the request, just log the error
        } else {
          console.log(`Updated game ${gameId}: ${actualAttendees} attendees, ${newAvailableTickets} available tickets`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and attendance recorded',
      gameId,
      playerId
    })

  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to confirm payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
