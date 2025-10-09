'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { HomepageGameCard } from '@/components/homepage-game-card'
import { SeasonCard } from '@/components/season-card'
import { useAuth } from '@/contexts/auth-context'
import { GameCardSkeleton } from '@/components/ui/skeleton-loader'

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
  }
  game_attendees?: {
    id: string
    player_id: string
    payment_status: string
    attendance_status?: 'attending' | 'not_attending'
    players?: {
      name: string
      photo_url?: string
    }
  }[]
  season_attendees?: {
    id: string
    player_id: string
    payment_status: string
    players?: {
      name: string
      photo_url?: string
    }
  }[]
  season_game_attendance?: {
    attendance_status: 'attending' | 'not_attending'
    season_attendees: {
      id: string
      player_id: string
      payment_status: string
      players?: {
        name: string
        photo_url?: string
      }
    }
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
    players?: {
      name: string
      photo_url?: string
    }
  }[]
}

export default function GamesPage() {
  const { player } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreGames, setHasMoreGames] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalGames, setTotalGames] = useState(0)
  const [dataFetched, setDataFetched] = useState(false)
  
  const GAMES_PER_PAGE = 10
  const CACHE_KEY = 'games-page-data'
  const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

  useEffect(() => {
    if (!dataFetched) {
      fetchGames()
      fetchSeasons()
    }
  }, [dataFetched, fetchGames, fetchSeasons])

  const fetchGames = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      // Check cache for first page only
      if (page === 1 && !append) {
        const cachedData = getCachedData()
        if (cachedData) {
          setGames(cachedData.games)
          setTotalGames(cachedData.totalGames)
          setHasMoreGames(cachedData.hasMoreGames)
          setLoading(false)
          setDataFetched(true)
          return
        }
      }

      const offset = (page - 1) * GAMES_PER_PAGE
      
      // First, get total count for pagination
      const { count: totalCount } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .gte('game_date', new Date().toISOString().split('T')[0])

      setTotalGames(totalCount || 0)
      setHasMoreGames(offset + GAMES_PER_PAGE < (totalCount || 0))

      // Then fetch the paginated games
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          groups (
            name,
            whatsapp_group
          ),
          seasons (
            id,
            season_signup_deadline
          ),
          game_attendees (
            id,
            player_id,
            payment_status,
            attendance_status
          )
        `)
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })
        .range(offset, offset + GAMES_PER_PAGE - 1)

      if (error) {
        console.error('Error fetching games:', error)
        return
      }


      // For each game, fetch player data separately to avoid complex nested queries
      const gamesWithPlayerData = await Promise.all(
        (data || []).map(async (game) => {
          // First, fetch player data for individual game attendees
          let gameAttendeesWithPlayers = game.game_attendees || []
          if (game.game_attendees && game.game_attendees.length > 0) {
            try {
              const { data: gameAttendeesData, error: gameAttendeesError } = await supabase
                .from('game_attendees')
                .select(`
                  id,
                  player_id,
                  payment_status,
                  attendance_status,
                  players (
                    name,
                    photo_url
                  )
                `)
                .eq('game_id', game.id)
                .eq('payment_status', 'completed')

              if (!gameAttendeesError && gameAttendeesData) {
                gameAttendeesWithPlayers = gameAttendeesData.map(attendee => ({
                  id: attendee.id,
                  player_id: attendee.player_id,
                  payment_status: attendee.payment_status,
                  attendance_status: attendee.attendance_status,
                  players: attendee.players || { name: 'Unknown Player' }
                }))
              }
            } catch (err) {
              console.error('Error fetching game attendees for game:', game.id, err)
            }
          }

          if (game.season_id) {
            try {
              // Fetch season attendees for this game's season
              const { data: seasonAttendees, error: seasonError } = await supabase
                .from('season_attendees')
                .select(`
                  id,
                  created_at,
                  player_id,
                  players (
                    name,
                    photo_url
                  )
                `)
                .eq('season_id', game.season_id)
                .eq('payment_status', 'completed')

              if (!seasonError && seasonAttendees) {
                // Fetch season game attendance for this specific game
                const { data: seasonGameAttendance } = await supabase
                  .from('season_game_attendance')
                  .select('season_attendee_id, attendance_status')
                  .eq('game_id', game.id)

                // Combine season attendees with their attendance status for this game
                const seasonAttendeesWithStatus = seasonAttendees.map(attendee => {
                  const gameAttendance = seasonGameAttendance?.find(ga => ga.season_attendee_id === attendee.id)
                  return {
                    id: attendee.id,
                    player_id: attendee.player_id,
                    payment_status: 'completed',
                    attendance_status: gameAttendance?.attendance_status || 'attending',
                    players: attendee.players || { name: 'Unknown Player' }
                  }
                })

                // Combine individual game attendees with season attendees
                const allAttendees = [
                  ...gameAttendeesWithPlayers,
                  ...seasonAttendeesWithStatus
                ]

                // Remove duplicates based on player_id
                const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
                  index === self.findIndex(a => a.player_id === attendee.player_id)
                )

                // Create season_game_attendance structure with player data
                const seasonGameAttendanceWithPlayers = seasonAttendeesWithStatus.map(attendee => ({
                  attendance_status: attendee.attendance_status,
                  season_attendees: {
                    id: attendee.id,
                    player_id: attendee.player_id,
                    payment_status: attendee.payment_status,
                    players: attendee.players
                  }
                }))

                return {
                  ...game,
                  game_attendees: uniqueAttendees,
                  season_attendees: seasonAttendees,
                  season_game_attendance: seasonGameAttendanceWithPlayers
                }
              }
            } catch (err) {
              console.error('Error fetching season attendees for game:', game.id, err)
            }
          }
          
          // For non-season games, return with processed individual attendees
          return {
            ...game,
            game_attendees: gameAttendeesWithPlayers
          }
        })
      )

      if (append) {
        setGames(prevGames => [...prevGames, ...gamesWithPlayerData])
      } else {
        setGames(gamesWithPlayerData)
        // Cache the first page data
        if (page === 1) {
          setCachedData({
            games: gamesWithPlayerData,
            totalGames: totalCount || 0,
            hasMoreGames: offset + GAMES_PER_PAGE < (totalCount || 0)
          })
        }
      }
    } catch (err) {
      console.error('Error fetching games:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setDataFetched(true)
    }
  }

  // Simple cache functions
  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error)
    }
    return null
  }

  const setCachedData = (data: {
    games: Game[];
    totalGames: number;
    hasMoreGames: boolean;
  }) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error setting cache:', error)
    }
  }, [supabase, currentPage, setCachedData])

  const loadMoreGames = async () => {
    if (loadingMore || !hasMoreGames) return
    
    setLoadingMore(true)
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    await fetchGames(nextPage, true)
  }

  const fetchSeasons = useCallback(async () => {
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
            payment_status,
            players (
              name,
              photo_url
            )
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
    }
  }, [supabase])


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
          <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">
            Upcoming Games
          </h1>
          <p className="text-gray-600">
            Find and join games in your area
          </p>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="max-w-lg mx-auto space-y-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <GameCardSkeleton key={index} />
            ))}
          </div>
        ) : games.length === 0 && seasons.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <Image 
                src="/game.png" 
                alt="Game" 
                width={64} 
                height={64} 
                className="w-16 h-16 mx-auto rounded-full object-cover"
              />
            </div>
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
              <div className="max-w-lg mx-auto mb-8 space-y-6">
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
                      seasonAttendees={season.season_attendees}
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
                      
                      // Check if current user is attending this game
                      const isUserAttending = !!(player && game.game_attendees?.some(
                        (attendee) => attendee.player_id === player.id && attendee.payment_status === 'completed'
                      ))

                      // Check if user has purchased the season (for season games)
                      const hasPurchasedSeason = game.season_id && player && game.season_game_attendance?.some(
                        (attendance) => attendance.season_attendees.player_id === player.id && attendance.season_attendees.payment_status === 'completed'
                      ) || false

                      // For season games, if they purchased the season, they're considered attending by default
                      const isUserAttendingSeason = isUserAttending || hasPurchasedSeason
                      
                      return (
                        <HomepageGameCard
                          key={game.id}
                          gameName={game.name}
                          time={game.game_time}
                          price={game.price}
                          location={game.location}
                          maxAttendees={game.total_tickets}
                          groupName={game.groups.name}
                          gameId={game.id}
                          tags={[]}
                          seasonId={game.season_id || game.seasons?.id}
                          seasonSignupDeadline={game.season_signup_deadline || game.seasons?.season_signup_deadline}
                          isUserAttending={isUserAttendingSeason}
                          hasPurchasedSeason={hasPurchasedSeason}
                          gameAttendees={game.game_attendees}
                          seasonGameAttendance={game.season_game_attendance}
                        />
                      )
                    })}
                  </div>
                </div>
              ))
            })()}
              </div>
            )}

            {/* Load More Button */}
            {games.length > 0 && hasMoreGames && (
              <div className="max-w-lg mx-auto mt-8">
                <Button
                  onClick={loadMoreGames}
                  disabled={loadingMore}
                  className="w-full"
                  variant="outline"
                >
                  {loadingMore ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                      Loading more games...
                    </div>
                  ) : (
                    `Load More Games (${totalGames - games.length} remaining)`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}

