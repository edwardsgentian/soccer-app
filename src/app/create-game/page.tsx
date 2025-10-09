'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CreateGameWizard } from '@/components/games/create-game-wizard'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { useState, Suspense } from 'react'

function CreateGameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const groupId = searchParams.get('groupId')
  const { player } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleCancel = () => {
    router.back()
  }

  const handleComplete = async (wizardData: Record<string, unknown>) => {
    setLoading(true)
    
    try {
      if (!groupId) {
        throw new Error('Group ID is required to create games')
      }
      
      if (!player?.id) {
        throw new Error('You must be signed in to create games or seasons')
      }
      
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      if (!wizardData.adminPassword || (typeof wizardData.adminPassword === 'string' && wizardData.adminPassword.trim() === '')) {
        throw new Error('Admin password is required')
      }
      
      // Verify admin password
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('admin_password')
        .eq('id', groupId)
        .single()

      if (groupError) {
        console.error('Group lookup error:', groupError)
        throw new Error('Group not found')
      }

      // Simple password verification
      const hashedPassword = btoa(wizardData.adminPassword as string)
      
      if (groupData.admin_password !== hashedPassword) {
        throw new Error('Invalid admin password')
      }

      // Create based on type
      if (wizardData.type === 'one-off') {
        await createOneOffGame(wizardData)
      } else {
        await createSeason(wizardData)
      }
      
      // Redirect back to group page
      router.push(`/groups/${groupId}`)
    } catch (err) {
      console.error('Error creating game/season:', err)
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err) || 'Failed to create game/season'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const createOneOffGame = async (data: Record<string, unknown>) => {
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        group_id: groupId,
        name: data.name,
        description: data.description,
        game_date: data.date,
        game_time: data.time,
        location: data.location,
        price: parseFloat(data.price as string),
        total_tickets: parseInt(data.spots as string),
        available_tickets: parseInt(data.spots as string),
        duration_hours: parseFloat(data.durationHours as string),
        created_by: player?.id,
        is_individual_sale_allowed: true
      })
      .select()
      .single()

    if (error) throw error

    // Add organizer as attendee if needed
    if (data.includeOrganizerInCount && player?.id) {
      const { error: attendeeError } = await supabase
        .from('game_attendees')
        .insert({
          game_id: game.id,
          player_id: player.id,
          payment_status: 'completed',
          amount_paid: 0,
          is_attending: true
        })
      
      if (attendeeError) throw attendeeError
    }

    // Create discount code if needed
    if (data.createDiscount) {
      await createDiscountCode(data, game.id, null)
    }
  }

  const createSeason = async (data: Record<string, unknown>) => {
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .insert({
        group_id: groupId,
        name: data.name,
        description: data.description,
        price: parseFloat(data.seasonPrice as string),
        game_price: parseFloat(data.gamePrice as string),
        total_games: parseInt(data.totalGames as string),
        season_spots: parseInt(data.seasonSpots as string),
        game_spots: parseInt(data.gameSpots as string),
        is_individual_sale_allowed: data.allowIndividual,
        signup_deadline: data.seasonSignupDeadline,
        created_by: player?.id
      })
      .select()
      .single()

    if (seasonError) throw seasonError

    // Generate and create individual games
    const gameDates = generateGameDates(data)
    const gameInserts = gameDates.map((gameDate) => ({
      group_id: groupId,
      season_id: season.id,
      name: `${data.name} - Game ${gameDates.indexOf(gameDate) + 1}`,
      game_date: gameDate.date,
      game_time: gameDate.time,
      location: data.location,
      price: parseFloat(data.gamePrice as string),
      total_tickets: parseInt(data.gameSpots as string),
      available_tickets: parseInt(data.gameSpots as string),
      duration_hours: 2.0,
      created_by: player?.id,
      is_individual_sale_allowed: data.allowIndividual
    }))

    const { data: createdGames, error: gamesError } = await supabase
      .from('games')
      .insert(gameInserts)
      .select()

    if (gamesError) throw gamesError

    // Add organizer to each game if needed
    if (data.includeOrganizerInCount && player?.id && createdGames) {
      const attendeeInserts = createdGames.map((game) => ({
        game_id: game.id,
        player_id: player.id,
        payment_status: 'completed',
        amount_paid: 0,
        is_attending: true
      }))

      const { error: attendeeError } = await supabase
        .from('game_attendees')
        .insert(attendeeInserts)

      if (attendeeError) throw attendeeError
    }

    // Create discount code if needed
    if (data.createDiscount) {
      await createDiscountCode(data, null, season.id)
    }
  }

  const createDiscountCode = async (data: Record<string, unknown>, gameId: string | null, seasonId: string | null) => {
    const { error } = await supabase
      .from('discount_codes')
      .insert({
        code: data.discountCode,
        description: data.discountDescription,
        discount_type: data.discountType,
        discount_value: parseFloat(data.discountValue as string),
        game_id: gameId,
        season_id: seasonId,
        is_active: true
      })

    if (error) throw error
  }

  const generateGameDates = (data: Record<string, unknown>) => {
    // Handle custom dates
    if (data.repeatType === 'custom' && Array.isArray(data.customGameDates) && data.customGameDates.length > 0) {
      return data.customGameDates.map((game: { date: string; time: string }) => ({
        date: game.date,
        time: game.time
      }))
    }

    // Generate dates based on repeat type
    const gameDates = []
    const startDate = new Date(data.firstDate as string)
    const totalGames = parseInt(data.totalGames as string)
    const repeatType = data.repeatType as string
    const intervalDays = repeatType === 'weekly' ? 7 : 14

    for (let i = 0; i < totalGames; i++) {
      const gameDate = new Date(startDate)
      gameDate.setDate(startDate.getDate() + (i * intervalDays))
      
      gameDates.push({
        date: gameDate.toISOString().split('T')[0],
        time: data.firstTime as string
      })
    }

    return gameDates
  }

  if (!groupId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error: No group ID provided</p>
      </div>
    )
  }

  return (
    <CreateGameWizard 
      onCancel={handleCancel}
      onComplete={handleComplete}
      loading={loading}
    />
  )
}

export default function CreateGamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-500 to-teal-400">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <CreateGameContent />
    </Suspense>
  )
}
