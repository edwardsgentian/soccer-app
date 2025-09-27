'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { HomepageGameCard } from '@/components/homepage-game-card'
import { CalendarCheck, Clock, MapPin, Calendar, Users, DollarSign, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { JoinModal } from '@/components/join-flow/join-modal'

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
  repeat_interval: number
  allow_individual_sales: boolean
  season_signup_deadline: string
  include_organizer_in_count: boolean
  location: string
  created_at: string
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
  game_number: number
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

export default function SeasonDetailPage() {
  const params = useParams()
  const seasonId = params.id as string
  const { player } = useAuth()
  
  const [season, setSeason] = useState<Season | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const fetchSeasonDetails = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      // Fetch season details
      const { data: seasonData, error: seasonError } = await supabase
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
        .eq('id', seasonId)
        .single()

      if (seasonError) {
        throw seasonError
      }

      console.log('=== RAW SEASON DATA ===')
      console.log('Season ID:', seasonData.id)
      console.log('Season Spots:', seasonData.season_spots)
      console.log('Season Attendees Count:', seasonData.season_attendees?.length || 0)
      console.log('Season Attendees Details:', seasonData.season_attendees?.map((att: { id: string; player_id: string; payment_status: string; players?: { name: string } }) => ({
        id: att.id,
        player_id: att.player_id,
        payment_status: att.payment_status,
        player_name: att.players?.name
      })))

      setSeason(seasonData)

      // Fetch games for this season
      const { data: gamesData, error: gamesError } = await supabase
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
            payment_status,
            attendance_status
          )
        `)
        .eq('season_id', seasonId)
        .order('game_date', { ascending: true })

      if (gamesError) {
        console.error('Error fetching games:', gamesError)
      } else {
        // For each game, combine individual game attendees with season attendees
        const gamesWithCombinedAttendees = await Promise.all(
          (gamesData || []).map(async (game) => {
            try {
              // Fetch season game attendance for this specific game
              const { data: seasonGameAttendance } = await supabase
                .from('season_game_attendance')
                .select('season_attendee_id, attendance_status')
                .eq('game_id', game.id)

              // Get season attendees for this game's season (we already have this from seasonData)
              const seasonAttendees = seasonData.season_attendees?.filter(
                (attendee: { payment_status: string }) => attendee.payment_status === 'completed'
              ) || []

              // Combine season attendees with their attendance status for this game
              const seasonAttendeesWithStatus = seasonAttendees.map((attendee: { id: string; player_id: string; payment_status: string }) => {
                const gameAttendance = seasonGameAttendance?.find(ga => ga.season_attendee_id === attendee.id)
                return {
                  id: attendee.id,
                  player_id: attendee.player_id,
                  payment_status: 'completed',
                  attendance_status: gameAttendance?.attendance_status || 'attending'
                }
              })

              // Combine individual game attendees with season attendees
              const allAttendees = [
                ...(game.game_attendees || []),
                ...seasonAttendeesWithStatus
              ]

              // Remove duplicates based on player_id
              const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
                index === self.findIndex(a => a.player_id === attendee.player_id)
              )

              return {
                ...game,
                game_attendees: uniqueAttendees
              }
            } catch (err) {
              console.error('Error combining attendees for game:', game.id, err)
              return game
            }
          })
        )

        // Debug: Log attendee data for season games
        gamesWithCombinedAttendees.forEach(game => {
          console.log(`Season page - Game ${game.name} - total attendees: ${game.game_attendees?.length || 0}`)
          const attendingCount = game.game_attendees?.filter((att: { payment_status: string; attendance_status?: string }) => 
            att.payment_status === 'completed' && 
            (att.attendance_status === 'attending' || !att.attendance_status)
          ).length || 0
          console.log(`Season page - Game ${game.name} - attending count: ${attendingCount}`)
        })

        setGames((gamesWithCombinedAttendees as unknown as Game[]) || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Season not found')
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    if (seasonId) {
      fetchSeasonDetails()
    }
  }, [seasonId, fetchSeasonDetails])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getRepeatDisplay = (repeatType: string, repeatInterval: number) => {
    if (repeatType === 'weekly') return 'Every week'
    if (repeatType === 'bi-weekly') return 'Every 2 weeks'
    if (repeatType === 'custom') return `Every ${repeatInterval} week${repeatInterval > 1 ? 's' : ''}`
    return repeatType
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading season details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !season) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="mb-4">
              <Image 
                src="/calendar.png" 
                alt="Calendar" 
                width={64} 
                height={64} 
                className="w-16 h-16 mx-auto rounded-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Season Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The season you are looking for does not exist.'}</p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Get unique season attendees (remove duplicates by player_id)
  const uniqueSeasonAttendees = season.season_attendees?.filter((att: { payment_status: string; players?: { name: string; photo_url?: string } }) => att.payment_status === 'completed') || []
  const deduplicatedAttendees = uniqueSeasonAttendees.filter((attendee, index, self) =>
    index === self.findIndex(a => a.player_id === attendee.player_id)
  )
  
  // Calculate season attendees count (no organizer logic)
  const seasonAttendeesCount = deduplicatedAttendees.length
  
  const seasonSpotsAvailable = season.season_spots - seasonAttendeesCount
  
  // Debug logging
  console.log('=== SEASON ATTENDEES CALCULATION ===')
  console.log('Total Spots:', season.season_spots)
  console.log('Raw Attendees Count:', season.season_attendees?.length || 0)
  console.log('Paid Attendees Count:', uniqueSeasonAttendees.length)
  console.log('Unique Attendees Count:', deduplicatedAttendees.length)
  console.log('Final Count:', seasonAttendeesCount)
  console.log('Available Spots:', seasonSpotsAvailable)
  console.log('Deduplicated Attendees:', deduplicatedAttendees.map(att => ({
    id: att.id,
    player_id: att.player_id,
    name: att.players?.name,
    payment_status: att.payment_status
  })))
  
  // Check if current user is attending this season
  const isUserAttending = season.season_attendees?.some(att => 
    att.payment_status === 'completed' && att.player_id === player?.id
  ) || false

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Season Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
                {/* Season Header */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{season.name}</h1>
                  <p className="text-gray-600 mb-4">{season.groups.name}</p>
                  
                  {season.description && (
                    <p className="text-gray-600 text-sm">{season.description}</p>
                  )}
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-6">Season Details</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start text-gray-600">
                    <Clock className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">First Game</div>
                      <div className="text-sm">{formatDate(season.first_game_date)}</div>
                      <div className="text-sm">{formatTime(season.first_game_time)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Location</div>
                      <div className="text-sm">{season.location}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start text-gray-600">
                    <Calendar className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Schedule</div>
                      <div className="text-sm">{getRepeatDisplay(season.repeat_type, season.repeat_interval)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start text-gray-600">
                    <Users className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Season Spots</div>
                      <div className="text-sm mb-3">{seasonSpotsAvailable} of {season.season_spots} available</div>
                      
                      {/* Show season attendees */}
                      {deduplicatedAttendees.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-2">Players signed up:</div>
                          <div className="space-y-1">
                            {deduplicatedAttendees.map((attendee) => (
                              <div key={attendee.id} className="flex items-center text-xs text-gray-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span>{attendee.players?.name || 'Unknown Player'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start text-gray-600">
                    <DollarSign className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Pricing</div>
                      <div className="text-sm">${season.season_price} season pass</div>
                      <div className="text-sm">${season.individual_game_price} per game</div>
                    </div>
                  </div>
                  
                  {season.season_signup_deadline && (
                    <div className="flex items-start text-gray-600">
                      <CalendarCheck className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">Signup Deadline</div>
                        <div className="text-sm">{formatDate(season.season_signup_deadline)}</div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Right Column - Games */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">Season Games</h2>
                  
                  {/* Join Season Button */}
                  {!isUserAttending && seasonSpotsAvailable > 0 && (
                    <Button 
                      onClick={() => setShowJoinModal(true)}
                    >
                      Join Season - ${season.season_price}
                    </Button>
                  )}

                  {/* Attending Status */}
                  {isUserAttending && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <div className="flex items-center">
                        <CalendarCheck className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium text-sm">Attending</span>
                      </div>
                    </div>
                  )}

                  {/* Season Full */}
                  {!isUserAttending && seasonSpotsAvailable <= 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-gray-600 font-medium text-sm">Season Full</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600">
                  {games.length} games scheduled for this season
                </p>
              </div>

              {games.length === 0 ? (
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
                    No games scheduled yet
                  </h3>
                  <p className="text-gray-600">
                    Games for this season haven&apos;t been created yet.
                  </p>
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
                            
                            // Check if current user is attending this game (individual purchase)
                            const isUserAttendingIndividual = !!(player && game.game_attendees?.some(
                              (attendee) => attendee.player_id === player.id && attendee.payment_status === 'completed'
                            ))
                            
                            // Check if user has purchased the season
                            const hasPurchasedSeason = !!(player && season.season_attendees?.some(
                              (attendee) => attendee.player_id === player.id && attendee.payment_status === 'completed'
                            ))
                            
                            // For season games, if they purchased the season, they're considered attending by default
                            // The actual attendance status will be managed on the game page
                            const isUserAttending = isUserAttendingIndividual || hasPurchasedSeason
                            
                            return (
                              <HomepageGameCard
                                key={game.id}
                                gameName={game.name}
                                time={game.game_time}
                                price={game.price}
                                location={game.location}
                                maxAttendees={game.total_tickets}
                                groupName={season.groups.name}
                                gameId={game.id}
                                tags={['Intermediate', 'Outdoors']}
                                seasonId={season.id}
                                seasonSignupDeadline={season.season_signup_deadline}
                                isUserAttending={isUserAttending}
                                hasPurchasedSeason={hasPurchasedSeason}
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
            </div>
          </div>
        </div>
      </div>

      {/* Join Modal */}
      <JoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        seasonId={seasonId}
        price={season?.season_price || 0}
        seasonName={season?.name}
      />
    </div>
  )
}
