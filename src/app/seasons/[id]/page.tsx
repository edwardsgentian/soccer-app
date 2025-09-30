'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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
    id: string
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
    id: string
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
  season_game_attendance?: {
    attendance_status: 'attending' | 'not_attending'
    season_attendees: {
      id: string
      player_id: string
      payment_status: string
    }
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
            id,
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
            id,
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
          ),
          season_game_attendance (
            attendance_status,
            season_attendees (
              id,
              player_id,
              payment_status
            )
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

  // Check if the season has ended (all games have passed)
  const isSeasonEnded = () => {
    if (!games || games.length === 0) return false
    
    // Find the last game date
    const lastGame = games.reduce((latest, game) => {
      const gameDate = new Date(game.game_date)
      const latestDate = new Date(latest.game_date)
      return gameDate > latestDate ? game : latest
    })
    
    const lastGameDateTime = new Date(`${lastGame.game_date}T${lastGame.game_time}`)
    const now = new Date()
    return lastGameDateTime < now
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
            <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">Season Not Found</h1>
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
  console.log('Deduplicated Attendees:', deduplicatedAttendees.map((att: { id: string; player_id: string; payment_status: string; players?: { name: string; photo_url?: string } }) => ({
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

        {/* Main Content - Airbnb Style Layout */}
        <div className="max-w-7xl mx-auto pb-32 lg:pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Season Information & Games */}
            <div className="lg:col-span-2 space-y-8">
              {/* Season Header */}
              <div>
                <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">{season.name}</h1>
                <Link href={`/groups/${season.groups.id}`} className="text-lg text-gray-600 mb-4 hover:text-blue-600 transition-colors">
                  {season.groups.name}
                </Link>
                
                {season.description && (
                  <p className="text-gray-700 text-base leading-relaxed">{season.description}</p>
                )}
              </div>

              {/* Season Details */}
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Season overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <Clock className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Starts</div>
                      <div className="text-gray-600">{formatDate(season.first_game_date)}</div>
                      <div className="text-gray-600">{formatTime(season.first_game_time)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Location</div>
                      <div className="text-gray-600">{season.location}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Schedule</div>
                      <div className="text-gray-600">{getRepeatDisplay(season.repeat_type, season.repeat_interval)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Users className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Season Spots</div>
                      <div className="text-gray-600">{seasonSpotsAvailable} of {season.season_spots} available</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <DollarSign className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Pricing</div>
                      <div className="text-gray-600">${season.season_price} season pass</div>
                      <div className="text-gray-600">${season.individual_game_price} per game</div>
                    </div>
                  </div>
                  
                  {season.season_signup_deadline && (
                    <div className="flex items-start">
                      <CalendarCheck className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Signup Deadline</div>
                        <div className="text-gray-600">{formatDate(season.season_signup_deadline)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Games Section */}
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Season Games</h2>
                
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
              </div>
            </div>

            {/* Right Column - Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 lg:sticky lg:top-8 fixed bottom-0 left-0 right-0 lg:relative lg:bottom-auto lg:left-auto lg:right-auto z-50 lg:z-auto">
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-2xl lg:shadow-sm">
                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline mb-2">
                      <span className="text-3xl font-bold text-gray-900">${season.season_price}</span>
                      <span className="text-gray-600 ml-2">season pass</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      ${season.individual_game_price} per individual game
                    </div>
                  </div>

                  {/* Join Button - Desktop Only */}
                  <div className="hidden lg:block">
                    {isSeasonEnded() ? (
                      <div className="w-full bg-gray-400 text-white py-3 px-4 rounded-lg text-center font-medium mb-6">
                        Closed
                      </div>
                    ) : !isUserAttending && seasonSpotsAvailable > 0 ? (
                      <Button 
                        onClick={() => setShowJoinModal(true)}
                        className="w-full mb-6"
                        size="lg"
                      >
                        Join Season - ${season.season_price}
                      </Button>
                    ) : null}
                  </div>

                  {/* Attending Status - Desktop Only */}
                  <div className="hidden lg:block">
                    {isUserAttending && (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6">
                        <div className="flex items-center">
                          <CalendarCheck className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-green-800 font-medium">You&apos;re attending this season</span>
                        </div>
                      </div>
                    )}

                    {/* Season Full */}
                    {!isUserAttending && seasonSpotsAvailable <= 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
                        <span className="text-gray-600 font-medium">Season is full</span>
                      </div>
                    )}
                  </div>

                  {/* Season Members */}
                  {deduplicatedAttendees.length > 0 && (
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Season Members ({deduplicatedAttendees.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {deduplicatedAttendees.map((attendee: { id: string; player_id: string; payment_status: string; players?: { name: string; photo_url?: string } }) => (
                          <div 
                            key={attendee.id} 
                            className="relative group"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer">
                              {attendee.players?.photo_url ? (
                                <Image
                                  src={attendee.players.photo_url}
                                  alt={attendee.players.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-gray-600">
                                  {attendee.players?.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                              {attendee.players?.name || 'Unknown Player'}
                              {/* Tooltip arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Join Button - Only visible on mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
        <div className="p-4">
          {isSeasonEnded() ? (
            <div className="w-full bg-gray-400 text-white py-3 px-4 rounded-lg text-center font-medium">
              Closed
            </div>
          ) : !isUserAttending && seasonSpotsAvailable > 0 ? (
            <Button 
              onClick={() => setShowJoinModal(true)}
              className="w-full"
              size="lg"
            >
              Join Season - ${season.season_price}
            </Button>
          ) : isUserAttending ? (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <div className="flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">You&apos;re attending this season</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="text-center text-gray-600">
                Season is full
              </div>
            </div>
          )}
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
