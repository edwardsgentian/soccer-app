import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { seasonId, playerId, gameAttendance } = await request.json()

    if (!seasonId || !playerId || !gameAttendance) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if player is a season member
    const { data: seasonAttendee } = await supabase
      .from('season_attendees')
      .select('id, payment_status')
      .eq('season_id', seasonId)
      .eq('player_id', playerId)
      .eq('payment_status', 'completed')
      .single()

    if (!seasonAttendee) {
      return NextResponse.json({ error: 'Player is not a season member' }, { status: 403 })
    }

    // Get all games in the season
    const { data: seasonGames } = await supabase
      .from('games')
      .select('id, total_tickets')
      .eq('season_id', seasonId)
      .order('game_date', { ascending: true })

    if (!seasonGames || seasonGames.length === 0) {
      return NextResponse.json({ error: 'No games found for this season' }, { status: 404 })
    }

    // Validate game attendance data
    const validGameIds = seasonGames.map(game => game.id)
    for (const gameId in gameAttendance) {
      if (!validGameIds.includes(gameId)) {
        return NextResponse.json({ error: `Invalid game ID: ${gameId}` }, { status: 400 })
      }
      if (!['attending', 'not_attending'].includes(gameAttendance[gameId])) {
        return NextResponse.json({ error: `Invalid attendance status for game ${gameId}` }, { status: 400 })
      }
    }

    // Check capacity for games being marked as attending
    for (const gameId in gameAttendance) {
      if (gameAttendance[gameId] === 'attending') {
        const game = seasonGames.find(g => g.id === gameId)
        if (game) {
          // Count current attendees
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
            return NextResponse.json({ 
              error: `Game ${gameId} is full`, 
              gameId: gameId 
            }, { status: 409 })
          }
        }
      }
    }

    // Update attendance for all games
    const updates = []
    for (const gameId in gameAttendance) {
      updates.push({
        season_attendee_id: seasonAttendee.id,
        game_id: gameId,
        attendance_status: gameAttendance[gameId]
      })
    }

    const { error } = await supabase
      .from('season_game_attendance')
      .upsert(updates, {
        onConflict: 'season_attendee_id,game_id'
      })

    if (error) {
      console.error('Error updating season game attendance:', error)
      return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Season attendance updated successfully' 
    })
  } catch (error) {
    console.error('Error updating season attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
