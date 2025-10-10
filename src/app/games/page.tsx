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
import { fetchGamesWithAttendance, isUserAttendingGame, isUserAttendingSeason, getSeasonPlayerCount } from '@/lib/attendance-service'
import type { GameWithAttendance, SeasonWithAttendance } from '@/lib/attendance-service'

// Use the centralized types from attendance service
type Game = GameWithAttendance

type Season = SeasonWithAttendance

const GAMES_PER_PAGE = 20

export default function GamesPage() {
  const { player } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [, setTotalGames] = useState(0)
  const [hasMoreGames, setHasMoreGames] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)

  const fetchGames = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      // Use the centralized attendance service
      const games = await fetchGamesWithAttendance({
        dateFrom: new Date().toISOString().split('T')[0],
        limit: GAMES_PER_PAGE,
        offset: (page - 1) * GAMES_PER_PAGE
      })
      
      if (append) {
        setGames(prev => [...prev, ...games])
      } else {
        setGames(games)
      }
      
      // For now, we'll estimate total count based on current page
      // In a real implementation, you might want to add a separate count query
      setTotalGames(games.length * page)
      setHasMoreGames(games.length === GAMES_PER_PAGE)
      setLoading(false)
      setDataFetched(true)
    } catch (error) {
      console.error('Error fetching games:', error)
      setLoading(false)
    }
  }, [])

  const fetchSeasons = useCallback(async () => {
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
    } catch (error) {
      console.error('Error fetching seasons:', error)
    }
  }, [])

  const loadMoreGames = async () => {
    if (loadingMore || !hasMoreGames) return
    
    setLoadingMore(true)
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    await fetchGames(nextPage, true)
    setLoadingMore(false)
  }

  useEffect(() => {
    if (!dataFetched) {
      fetchGames()
      fetchSeasons()
    }
  }, [dataFetched, fetchGames, fetchSeasons])

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
              No games available
            </h3>
            <p className="text-gray-600 mb-6">
              Check back later for new games and seasons.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Games Section */}
            {games.length > 0 && (
              <div className="mb-12">
                <div className="space-y-6">
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
                            // Use the centralized attendance service
                            const attendanceInfo = player ? isUserAttendingGame(game, player.id) : { isAttending: false, hasPaid: false }
                            // const playerCount = getGamePlayerCount(game)


                            
                            return (
                              <HomepageGameCard
                                key={game.id}
                                gameName={game.name}
                                time={game.game_time}
                                price={game.price}
                                location={game.location}
                                maxAttendees={game.total_tickets}
                                groupName={game.groups?.name || 'Unknown Group'}
                                gameId={game.id}
                                tags={[]}
                                seasonId={game.season_id || game.seasons?.id}
                                seasonSignupDeadline={game.seasons?.season_signup_deadline}
                                isUserAttending={attendanceInfo.isAttending}
                                hasPurchasedSeason={attendanceInfo.hasPaid}
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
              </div>
            )}

            {/* Seasons Section */}
            {seasons.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Seasons</h2>
                <div className="max-w-lg mx-auto space-y-6">
                  {seasons.map((season) => {
                    // Use the centralized attendance service
                    const attendanceInfo = player ? isUserAttendingSeason(season, player.id) : { isAttending: false, hasPaid: false }
                    const playerCount = getSeasonPlayerCount(season)

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
                        groupName={season.groups?.name || 'Unknown Group'}
                        location={season.location}
                        seasonSpotsAvailable={season.season_spots - playerCount}
                        gameSpotsAvailable={season.game_spots}
                        seasonAttendees={season.season_attendees}
                        isUserAttending={attendanceInfo.isAttending}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Load More Button */}
            {hasMoreGames && (
              <div className="text-center mt-8">
                <Button
                  onClick={loadMoreGames}
                  disabled={loadingMore}
                  variant="outline"
                  className="px-8 py-3"
                >
                  {loadingMore ? 'Loading...' : 'Load More Games'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
