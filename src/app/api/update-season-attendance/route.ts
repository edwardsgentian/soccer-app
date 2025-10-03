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

    // Send confirmation email for season attendance
    try {
      // Get player and season details for email
      const { data: playerData } = await supabase
        .from('players')
        .select('name, email')
        .eq('id', playerId)
        .single()

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

      if (playerData && seasonData) {
        // Get current attendee count for spots available
        const { count: attendeeCount } = await supabase
          .from('season_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', seasonId)
          .eq('payment_status', 'completed')

        type Group = { name: string }
        const seasonGroupName = Array.isArray((seasonData as unknown as { groups?: Group | Group[] }).groups)
          ? ((seasonData as unknown as { groups?: Group | Group[] }).groups as Group[])[0]?.name
          : ((seasonData as unknown as { groups?: Group | Group[] }).groups as Group | undefined)?.name

        const emailData = {
          to: playerData.email,
          playerName: playerData.name,
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
          price: 0, // Season already paid for
          spotsAvailable: seasonData.season_spots - (attendeeCount || 0),
          totalSpots: seasonData.season_spots
        }

        // Call our email API
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-confirmation-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        })

        if (emailResponse.ok) {
          console.log('Season attendance confirmation email sent successfully')
        } else {
          console.error('Failed to send season attendance confirmation email:', await emailResponse.text())
        }
      }
    } catch (emailError) {
      console.error('Error sending season attendance confirmation email:', emailError)
      // Don't fail the attendance update if email fails
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
