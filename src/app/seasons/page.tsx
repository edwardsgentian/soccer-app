'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { SeasonCard } from '@/components/season-card'
import { useAuth } from '@/contexts/auth-context'

interface Season {
  id: string
  name: string
  description?: string
  season_price: number
  individual_game_price: number
  total_games: number
  season_spots: number
  game_spots: number
  first_game_date: string
  first_game_time: string
  repeat_type: string
  location: string
  groups: {
    name: string
    whatsapp_group?: string
  }
  season_attendees?: {
    id: string
    player_id: string
    payment_status: string
  }[]
}

export default function SeasonsPage() {
  const { player } = useAuth()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSeasons()
  }, [])

  const fetchSeasons = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('seasons')
        .select(`
          *,
          groups (
            name,
            whatsapp_group
          ),
          season_attendees (
            id,
            player_id,
            payment_status
          )
        `)
        .gte('first_game_date', new Date().toISOString().split('T')[0])
        .order('first_game_date', { ascending: true })

      if (error) {
        console.error('Error fetching seasons:', error)
        return
      }

      setSeasons(data || [])
    } catch (err) {
      console.error('Error fetching seasons:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Available Seasons
          </h1>
          <p className="text-gray-600">
            Join a full season and save on individual games
          </p>
        </div>

        {/* Seasons Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading seasons...</p>
          </div>
        ) : seasons.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <Image 
                src="/calendar.png" 
                alt="Calendar" 
                width={64} 
                height={64} 
                className="w-16 h-16 mx-auto rounded-full object-cover"
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No upcoming seasons yet
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to create a season in your area!
            </p>
            <Button
              onClick={() => window.location.href = '/groups'}
            >
              Create a Group
            </Button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-4">
            {seasons.map((season) => {
              // Calculate season attendees including organizer if they should be included
              const seasonAttendees = season.season_attendees?.filter(att => att.payment_status === 'completed').length || 0
              
              const seasonSpotsAvailable = season.season_spots - seasonAttendees
              const gameSpotsAvailable = season.game_spots
              
              // Check if current user is attending this season
              const isUserAttending = season.season_attendees?.some(att => 
                att.payment_status === 'completed' && att.player_id === player?.id
              ) || false
              
              return (
                <SeasonCard
                  key={season.id}
                  seasonId={season.id}
                  seasonName={season.name}
                  description={season.description}
                  seasonPrice={season.season_price}
                  individualGamePrice={season.individual_game_price}
                  totalGames={season.total_games}
                  seasonSpots={season.season_spots}
                  gameSpots={season.game_spots}
                  firstGameDate={season.first_game_date}
                  firstGameTime={season.first_game_time}
                  repeatType={season.repeat_type}
                  groupName={season.groups.name}
                  location={season.location}
                  seasonSpotsAvailable={seasonSpotsAvailable}
                  gameSpotsAvailable={gameSpotsAvailable}
                  isUserAttending={isUserAttending}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
