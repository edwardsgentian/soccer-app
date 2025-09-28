import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPDATE ATTENDANCE API CALLED ===')
    const { gameId, seasonId, playerId, attendanceStatus } = await request.json()
    console.log('Request data:', { gameId, seasonId, playerId, attendanceStatus })

    if (!gameId || !playerId || !attendanceStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['attending', 'not_attending'].includes(attendanceStatus)) {
      return NextResponse.json({ error: 'Invalid attendance status' }, { status: 400 })
    }

    // Check if the player has paid for this game or season
    let hasPaid = false
    let isSeasonMember = false
    let seasonAttendeeId = null

    if (seasonId) {
      // Check if player is a season member
      const { data: seasonAttendee } = await supabase
        .from('season_attendees')
        .select('id, payment_status')
        .eq('season_id', seasonId)
        .eq('player_id', playerId)
        .eq('payment_status', 'completed')
        .single()

      if (seasonAttendee) {
        hasPaid = true
        isSeasonMember = true
        seasonAttendeeId = seasonAttendee.id
      }
    } else {
      // Check if player has paid for individual game
      const { data: gameAttendee } = await supabase
        .from('game_attendees')
        .select('payment_status')
        .eq('game_id', gameId)
        .eq('player_id', playerId)
        .eq('payment_status', 'completed')
        .single()

      if (gameAttendee) {
        hasPaid = true
      }
    }

    if (!hasPaid) {
      return NextResponse.json({ error: 'Player has not paid for this game' }, { status: 403 })
    }

    // Check if game is full (only when trying to mark as attending)
    if (attendanceStatus === 'attending') {
      const { data: game } = await supabase
        .from('games')
        .select('total_tickets')
        .eq('id', gameId)
        .single()

      if (game) {
        // Count current attendees (including season members who are attending)
        const { data: currentAttendees } = await supabase
          .from('game_attendees')
          .select('id')
          .eq('game_id', gameId)
          .eq('payment_status', 'completed')
          .eq('attendance_status', 'attending')

        const { data: seasonAttendees } = await supabase
          .from('season_game_attendance')
          .select('id')
          .eq('game_id', gameId)
          .eq('attendance_status', 'attending')

        const totalAttending = (currentAttendees?.length || 0) + (seasonAttendees?.length || 0)

        if (totalAttending >= game.total_tickets) {
          return NextResponse.json({ error: 'Game is full' }, { status: 409 })
        }
      }
    }

    // Update attendance status
    if (isSeasonMember && seasonAttendeeId) {
      console.log('Updating season game attendance:', { seasonAttendeeId, gameId, attendanceStatus })
      // Update season game attendance
      const { error } = await supabase
        .from('season_game_attendance')
        .upsert({
          season_attendee_id: seasonAttendeeId,
          game_id: gameId,
          attendance_status: attendanceStatus
        }, {
          onConflict: 'season_attendee_id,game_id'
        })

      if (error) {
        console.error('Error updating season game attendance:', error)
        return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 })
      }
      console.log('Season game attendance updated successfully')
    } else {
      // Update individual game attendance
      const { error } = await supabase
        .from('game_attendees')
        .update({ attendance_status: attendanceStatus })
        .eq('game_id', gameId)
        .eq('player_id', playerId)

      if (error) {
        console.error('Error updating game attendance:', error)
        return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Attendance updated successfully' 
    })
  } catch (error) {
    console.error('Error updating attendance:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
