import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        name,
        description,
        game_date,
        game_time,
        location,
        price,
        total_tickets,
        available_tickets,
        duration_hours,
        created_at,
        game_attendees (
          id,
          payment_status
        )
      `)
      .eq('group_id', groupId)
      .gte('game_date', new Date().toISOString().split('T')[0])
      .order('game_date', { ascending: true })

    if (error) {
      console.error('Error fetching group games:', error)
      return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
    }

    // Process the data to include attendee counts
    const gamesMap = new Map()
    
    for (const item of data) {
      if (!gamesMap.has(item.id)) {
        gamesMap.set(item.id, {
          id: item.id,
          name: item.name,
          description: item.description,
          game_date: item.game_date,
          game_time: item.game_time,
          location: item.location,
          price: item.price,
          total_tickets: item.total_tickets,
          available_tickets: item.available_tickets,
          duration_hours: item.duration_hours,
          created_at: item.created_at,
          actualAttendees: 0
        })
      }
      
      // Count completed attendees
      if (item.game_attendees && Array.isArray(item.game_attendees)) {
        const completedAttendees = item.game_attendees.filter(
          (attendee: { payment_status: string }) => attendee.payment_status === 'completed'
        ).length
        
        const currentGame = gamesMap.get(item.id)
        currentGame.actualAttendees = completedAttendees
      }
    }

    const games = Array.from(gamesMap.values())
    
    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error in group-games API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}