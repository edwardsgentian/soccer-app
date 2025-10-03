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

    // Send confirmation email
    let emailSent = false
    try {
      console.log('📧 EMAIL PROCESSING STARTED')
      console.log('Sending confirmation email to:', playerEmail)
      console.log('Game ID:', gameId)
      console.log('Season ID:', seasonId)
      
      let emailData = null
      
      // Helper to normalize Supabase `groups` which can be an object or array
      type Group = { name: string }
      type HasGroups = { groups?: Group | Group[] }
      const extractGroupName = (maybeGroups: Group | Group[] | undefined): string | undefined => {
        return Array.isArray(maybeGroups) ? maybeGroups[0]?.name : maybeGroups?.name
      }

      if (gameId && gameId.trim() !== '') {
        // Fetch game details for email
        const { data: gameData } = await supabase
          .from('games')
          .select(`
            name,
            game_date,
            game_time,
            location,
            total_tickets,
            groups!inner(name)
          `)
          .eq('id', gameId)
          .single()

        if (gameData) {
          // Get current attendee count for spots available
          const { count: attendeeCount } = await supabase
            .from('game_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', gameId)
            .eq('payment_status', 'completed')

          const gameGroupName = extractGroupName((gameData as HasGroups).groups)

          emailData = {
            to: playerEmail,
            playerName: playerName || 'Player',
            type: 'game' as const,
            eventName: gameData.name,
            groupName: gameGroupName || 'Group',
            date: new Date(gameData.game_date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            time: gameData.game_time,
            location: gameData.location,
            price: session.amount_total ? session.amount_total / 100 : 0,
            spotsAvailable: gameData.total_tickets - (attendeeCount || 0),
            totalSpots: gameData.total_tickets
          }
        }
      } else if (seasonId && seasonId.trim() !== '') {
        // Fetch season details for email
        const { data: seasonData } = await supabase
          .from('seasons')
          .select(`
            name,
            first_game_date,
            first_game_time,
            location,
            season_spots,
            groups!inner(name)
          `)
          .eq('id', seasonId)
          .single()

        if (seasonData) {
          // Get current attendee count for spots available
          const { count: attendeeCount } = await supabase
            .from('season_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('season_id', seasonId)
            .eq('payment_status', 'completed')

          const seasonGroupName = extractGroupName((seasonData as HasGroups).groups)

          emailData = {
            to: playerEmail,
            playerName: playerName || 'Player',
            type: 'season' as const,
            eventName: seasonData.name,
            groupName: seasonGroupName || 'Group',
            date: new Date(seasonData.first_game_date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            time: seasonData.first_game_time,
            location: seasonData.location,
            price: session.amount_total ? session.amount_total / 100 : 0,
            spotsAvailable: seasonData.season_spots - (attendeeCount || 0),
            totalSpots: seasonData.season_spots
          }
        }
      }

      if (emailData) {
        console.log('📧 EMAIL DATA PREPARED:', emailData)
        // Call our email API
        console.log('📧 CALLING EMAIL API...')
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-confirmation-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        })

        console.log('📧 EMAIL API RESPONSE STATUS:', emailResponse.status)
        const emailResponseText = await emailResponse.text()
        console.log('📧 EMAIL API RESPONSE:', emailResponseText)

        if (emailResponse.ok) {
          console.log('✅ Confirmation email sent successfully')
          emailSent = true
        } else {
          console.error('❌ Failed to send confirmation email:', emailResponseText)
        }
      } else {
        console.log('❌ NO EMAIL DATA - cannot send email')
      }
      
    } catch (emailError) {
      console.error('❌ Error sending confirmation email:', emailError)
      // Don't fail the payment processing if email fails
      emailSent = false
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment processed successfully',
      seasonId: seasonId || null,
      emailSent: emailSent
    })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
