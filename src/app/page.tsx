'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button";
import { HomepageGameCard } from "@/components/homepage-game-card";
import { SeasonCard } from "@/components/season-card";
import { Header } from "@/components/header";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from '@/lib/supabase'

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
  season_id?: string
  season_signup_deadline?: string
  groups: {
    name: string
    whatsapp_group?: string
  }
  seasons?: {
    id: string
    season_signup_deadline: string
    include_organizer_in_count: boolean
  }
  game_attendees?: {
    id: string
    player_id: string
    payment_status: string
  }[]
}

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
  include_organizer_in_count?: boolean
}

export default function Home() {
  const { player } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingGames()
    fetchUpcomingSeasons()
  }, [])

  const fetchUpcomingGames = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      // First, get all upcoming games
      const { data: allGames, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          groups (
            name,
            whatsapp_group
          ),
          seasons (
            id,
            season_signup_deadline,
            include_organizer_in_count
          ),
          game_attendees (
            id,
            player_id,
            payment_status
          )
        `)
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })

      if (gamesError) {
        console.error('Error fetching games:', gamesError)
        return
      }

      setGames((allGames || []).slice(0, 6)) // Show only the first 6 games
    } catch (err) {
      console.error('Error fetching games:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcomingSeasons = async () => {
    if (!supabase) return

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
        .limit(3) // Show only the first 3 upcoming seasons on homepage

      if (error) {
        console.error('Error fetching seasons:', error)
        return
      }

      setSeasons(data || [])
    } catch (err) {
      console.error('Error fetching seasons:', err)
    }
  }
  return (
    <div className="min-h-screen bg-white">
      <div className="h-24" style={{background: 'linear-gradient(to bottom, #e2e8f0 0%, #ffffff 100%)'}}>
        <Header />
      </div>
      
      <div className="container mx-auto px-4 pt-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-8 leading-tight">
            Community soccer<br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent" style={{WebkitBackgroundClip: 'text', backgroundClip: 'text'}}>
              games start here
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Create a game or find social, soccer groups near you
          </p>
        </div>

        {/* Upcoming Games Section */}
        <div className="mb-12">
          
          {/* Game Cards Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading upcoming games...</p>
            </div>
          ) : games.length === 0 && seasons.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No upcoming games or seasons yet
              </h3>
              <p className="text-gray-600 mb-6">
                Be the first to create a game or season in your area!
              </p>
              <Button
                onClick={() => window.location.href = '/groups'}
              >
                Create a Group
              </Button>
            </div>
          ) : (
            <>
              {/* Seasons Section */}
              {seasons.length > 0 && (
                <div className="max-w-lg mx-auto mb-8">
                    {seasons.map((season) => {
                      // Calculate season attendees including organizer if they should be included
                      let seasonAttendees = season.season_attendees?.filter(att => att.payment_status === 'completed').length || 0
                      
                      // If organizer should be included in count, add 1
                      if (season.include_organizer_in_count) {
                        seasonAttendees += 1
                      }
                      
                      const seasonSpotsAvailable = season.season_spots - seasonAttendees
                      const gameSpotsAvailable = season.game_spots // Individual game spots (not affected by season signups)
                      
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

              {/* Games Section */}
              {games.length > 0 && (
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
                          // Calculate attendees including organizer if they should be included
                          let attendees = game.total_tickets - game.available_tickets
                          
                          // If this game is part of a season and organizer should be included, add 1
                          if (game.season_id && game.seasons?.include_organizer_in_count) {
                            attendees += 1
                          }
                          
                          // Check if current user is attending this game
                          const isUserAttending = !!(player && game.game_attendees?.some(
                            (attendee) => attendee.player_id === player.id && attendee.payment_status === 'completed'
                          ))
                          
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
                              tags={['Intermediate', 'Outdoors']}
                              seasonId={game.season_id || game.seasons?.id}
                              seasonSignupDeadline={game.season_signup_deadline || game.seasons?.season_signup_deadline}
                              isUserAttending={isUserAttending}
                              gameAttendees={game.game_attendees}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
                </div>
              )}

              {/* View All Games Button - Centered below tiles */}
              <div className="text-center mt-8">
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/games'}
                >
                  View All Games
                </Button>
              </div>
            </>
          )}
        </div>


        {/* How It Works Section */}
        <div className="p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Games</h3>
              <p className="text-gray-600">
                Browse upcoming soccer games in your area. See details like 
                location, time, price, and who&apos;s attending.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Book & Pay</h3>
              <p className="text-gray-600">
                Secure your spot with a quick payment. No account required - 
                just enter your details and pay with your card.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚽</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Play & Connect</h3>
              <p className="text-gray-600">
                Show up and play! Meet new people, improve your skills, 
                and join the community WhatsApp group.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
