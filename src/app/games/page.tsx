'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { HomepageGameCard } from '@/components/homepage-game-card'

interface Game {
  id: string
  name: string
  description?: string
  game_date: string
  game_time: string
  location: string
  price: number
  total_tickets: number
  available_tickets: number
  created_at: string
  groups: {
    name: string
    whatsapp_group?: string
  }
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          groups (
            name,
            whatsapp_group
          )
        `)
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })

      if (error) {
        console.error('Error fetching games:', error)
        return
      }

      setGames(data || [])
    } catch (err) {
      console.error('Error fetching games:', err)
    } finally {
      setLoading(false)
    }
  }


  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString)
  //   return date.toLocaleDateString('en-US', { 
  //     weekday: 'short', 
  //     month: 'short', 
  //     day: 'numeric' 
  //   })
  // }

  // const formatTime = (timeString: string) => {
  //   const [hours, minutes] = timeString.split(':')
  //   const hour = parseInt(hours)
  //   const ampm = hour >= 12 ? 'PM' : 'AM'
  //   const displayHour = hour % 12 || 12
  //   return `${displayHour}:${minutes} ${ampm}`
  // }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upcoming Games
          </h1>
          <p className="text-gray-600">
            Find and join soccer games in your area
          </p>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading games...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No upcoming games
            </h3>
            <p className="text-gray-600 mb-6">
              Join a group to create and participate in games!
            </p>
            <Button
              onClick={() => window.location.href = '/groups'}
            >
              Browse Groups
            </Button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-6">
            {(() => {
              // Group games by date
              const gamesByDate = games.reduce((acc, game) => {
                const date = new Date(game.game_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })
                if (!acc[date]) {
                  acc[date] = []
                }
                acc[date].push(game)
                return acc
              }, {} as Record<string, typeof games>)

              return Object.entries(gamesByDate).map(([date, dateGames]) => (
                <div key={date}>
                  {/* Date Label */}
                  <div className="text-center mb-4">
                    <h3 className="text-sm text-gray-600">
                      {date}
                    </h3>
                  </div>
                  
                  {/* Games for this date */}
                  <div className="space-y-4">
                    {dateGames.map((game) => {
                      const attendees = game.total_tickets - game.available_tickets
                      return (
                        <HomepageGameCard
                          key={game.id}
                          gameName={game.name}
                          time={game.game_time}
                          price={game.price}
                          location={game.location}
                          attendees={attendees}
                          maxAttendees={game.total_tickets}
                          groupName={game.groups.name}
                          gameId={game.id}
                          tags={[]}
                        />
                      )
                    })}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

    </div>
  )
}

