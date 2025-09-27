import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    const { gameId, seasonId, playerId, playerName, playerEmail, playerPhone } = session.metadata || {}

    console.log('Processing payment for session:', sessionId)
    console.log('Session metadata:', session.metadata)
    console.log('Extracted data:', { gameId, seasonId, playerId, playerName, playerEmail, playerPhone })

    if (!playerId) {
      console.error('Player ID not found in session metadata')
      return NextResponse.json({ error: 'Player ID not found in session' }, { status: 400 })
    }

    // Process game attendance
    if (gameId && gameId.trim() !== '') {
      console.log('Creating game attendee for game:', gameId, 'player:', playerId)
      
      const { error: gameError } = await supabase
        .from('game_attendees')
        .upsert({
          game_id: gameId,
          player_id: playerId,
          payment_intent_id: session.payment_intent as string,
          payment_status: 'completed',
          amount_paid: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents
        }, {
          onConflict: 'game_id,player_id'
        })

      if (gameError) {
        console.error('Error creating game attendee:', gameError)
        return NextResponse.json({ error: 'Failed to record game attendance' }, { status: 500 })
      }
      
      console.log('Game attendee created successfully')

      // Update available tickets
      const { data: currentGame, error: fetchError } = await supabase
        .from('games')
        .select('available_tickets')
        .eq('id', gameId)
        .single()

      if (!fetchError && currentGame) {
        const { error: updateError } = await supabase
          .from('games')
          .update({
            available_tickets: currentGame.available_tickets - 1
          })
          .eq('id', gameId)

        if (updateError) {
          console.error('Error updating available tickets:', updateError)
          // Don't fail the request, just log the error
        }
      }

      // Add player to group if not already a member
      const { data: game } = await supabase
        .from('games')
        .select('group_id')
        .eq('id', gameId)
        .single()

      if (game?.group_id) {
        // Check if member already exists
        const { data: existingMember } = await supabase
          .from('group_members')
          .select('games_attended')
          .eq('group_id', game.group_id)
          .eq('player_id', playerId)
          .single()

        const { error: memberError } = await supabase
          .from('group_members')
          .upsert({
            group_id: game.group_id,
            player_id: playerId,
            first_attended_at: new Date().toISOString(),
            games_attended: existingMember ? existingMember.games_attended + 1 : 1
          }, {
            onConflict: 'group_id,player_id'
          })

        if (memberError) {
          console.error('Error adding group member:', memberError)
          // Don't fail the request, just log the error
        }
      }
    }

    // Process season attendance
    if (seasonId && seasonId.trim() !== '') {
      console.log('Creating season attendee for season:', seasonId, 'player:', playerId)
      
      const { error: seasonError } = await supabase
        .from('season_attendees')
        .upsert({
          season_id: seasonId,
          player_id: playerId,
          payment_status: 'completed',
          amount_paid: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents
        }, {
          onConflict: 'season_id,player_id'
        })

      if (seasonError) {
        console.error('Error creating season attendee:', seasonError)
        return NextResponse.json({ error: 'Failed to record season attendance' }, { status: 500 })
      }
      
      console.log('Season attendee created successfully')

      // Add player to group if not already a member
      const { data: season } = await supabase
        .from('seasons')
        .select('group_id')
        .eq('id', seasonId)
        .single()

      if (season?.group_id) {
        const { error: memberError } = await supabase
          .from('group_members')
          .upsert({
            group_id: season.group_id,
            player_id: playerId,
            first_attended_at: new Date().toISOString(),
            games_attended: 0 // Season members haven't attended individual games yet
          }, {
            onConflict: 'group_id,player_id'
          })

        if (memberError) {
          console.error('Error adding group member:', memberError)
          // Don't fail the request, just log the error
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment processed successfully',
      seasonId: seasonId || null
    })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
