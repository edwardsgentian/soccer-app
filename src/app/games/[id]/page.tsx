'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Clock, MapPin, Calendar, DollarSign, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { JoinModal } from '@/components/join-flow/join-modal'
import { AttendanceToggle } from '@/components/attendance-toggle'

interface Game {
  id: string
  name: string
  description?: string
  game_date: string
  game_time: string
  location: string
  price: number
  total_tickets: number
  season_id?: string
  groups: {
    id: string
    name: string
    whatsapp_group?: string
  }
  seasons?: {
    id: string
    season_signup_deadline: string
    include_organizer_in_count: boolean
  }[]
}

interface Attendee {
  id: string
  created_at: string
  attendance_status?: 'attending' | 'not_attending'
  players: {
    name: string
    photo_url?: string
  }
}

// Removed unused interfaces

interface ProcessedAttendee {
  id: string
  created_at: string
  player_id: string
  payment_status: string
  attendance_status: string
  players: {
    name: string
    photo_url?: string
  }
}

export default function GameDetailPage() {
  const params = useParams()
  const gameId = params.id as string
  const { player, user } = useAuth()
  
  const [game, setGame] = useState<Game | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [userAttendanceStatus, setUserAttendanceStatus] = useState<'attending' | 'not_attending' | null>(null)
  const [hasPaid, setHasPaid] = useState(false)

  const fetchGameDetails = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      console.log('=== FETCH GAME DETAILS CALLED ===')
      
      // First, try a simple query to see if the game exists at all
      console.log('Fetching game details for ID:', gameId)
      const { data: simpleGameData, error: simpleGameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      console.log('Simple game query result:', simpleGameData)
      console.log('Simple game query error:', simpleGameError)

      if (simpleGameError) {
        console.error('Simple game query failed:', simpleGameError)
        throw simpleGameError
      }

      // Use the exact same query structure as the homepage
      const { data: gameData, error: gameError } = await supabase
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
            attendance_status,
            players (
              name,
              photo_url
            )
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
        .eq('id', gameId)
        .single()

      console.log('Game with basic joins query result:', gameData)
      console.log('Game with basic joins query error:', gameError)
      console.log('Game data game_attendees:', gameData?.game_attendees)
      console.log('Game data season_game_attendance:', gameData?.season_game_attendance)

      if (gameError) {
        console.error('Game with basic joins query failed:', gameError)
        // Use the simple data if joins fail
        setGame(simpleGameData)
      } else {
        setGame(gameData)
      }

      // Try a direct query on game_attendees table to see what's there
      const { data: directAttendees, error: directAttendeesError } = await supabase
        .from('game_attendees')
        .select(`
          id,
          player_id,
          payment_status,
          attendance_status,
          game_id,
          players!inner (
            name,
            photo_url
          )
        `)
        .eq('game_id', gameId)

      // Also try to get ALL game_attendees to see if there are any at all
      const { data: allGameAttendees, error: allGameAttendeesError } = await supabase
        .from('game_attendees')
        .select(`
          id,
          player_id,
          payment_status,
          attendance_status,
          game_id
        `)
        .limit(10)

      console.log('All game_attendees (first 10):', allGameAttendees)
      console.log('All game_attendees error:', allGameAttendeesError)

      console.log('Direct game_attendees query result:', directAttendees)
      console.log('Direct game_attendees query error:', directAttendeesError)
      console.log('Game ID being queried:', gameId)
      console.log('Direct attendees length:', directAttendees?.length)
      console.log('Direct attendees raw data:', JSON.stringify(directAttendees, null, 2))

      // Also try the nested query approach like the homepage
      const { data: gameWithNestedAttendees, error: nestedError } = await supabase
        .from('games')
        .select(`
          *,
          game_attendees (
            id,
            player_id,
            payment_status,
            attendance_status
          )
        `)
        .eq('id', gameId)
        .single()

      console.log('Nested query result:', gameWithNestedAttendees)
      console.log('Nested query error:', nestedError)
      console.log('Nested game_attendees:', gameWithNestedAttendees?.game_attendees)

        // Filter the direct results
        const attendeesData = directAttendees?.filter((att: { payment_status: string; attendance_status?: string }) => 
          att.payment_status === 'completed' &&
          (att.attendance_status === 'attending' || !att.attendance_status)
        ) || []

      // Also try filtering the nested results
      const nestedAttendeesData = gameWithNestedAttendees?.game_attendees?.filter((att: { payment_status: string; attendance_status?: string }) => 
        att.payment_status === 'completed' &&
        (att.attendance_status === 'attending' || !att.attendance_status)
      ) || []

      console.log('Direct filtered attendees:', attendeesData)
      console.log('Nested filtered attendees:', nestedAttendeesData)

      // Use the exact same processing logic as the homepage
      let individualAttendees = gameData?.game_attendees?.filter((att: { payment_status: string; attendance_status?: string }) => 
        att.payment_status === 'completed' &&
        (att.attendance_status === 'attending' || !att.attendance_status)
      ) || []
      
      // If the nested query didn't return individual attendees, try the direct query like the homepage does
      if (individualAttendees.length === 0 && directAttendees && directAttendees.length > 0) {
        console.log('Nested query returned no individual attendees, using direct query results')
        individualAttendees = directAttendees.filter((att: { payment_status: string; attendance_status?: string }) => 
          att.payment_status === 'completed' &&
          (att.attendance_status === 'attending' || !att.attendance_status)
        )
      }
      
      // Count season attendees who are attending this specific game
      const seasonAttendees = gameData?.season_game_attendance?.filter((att: { attendance_status: string; season_attendees: { payment_status: string } }) => 
        att.attendance_status === 'attending' && 
        att.season_attendees.payment_status === 'completed'
      ) || []

      console.log('Individual attendees (homepage logic):', individualAttendees)
      console.log('Season attendees (homepage logic):', seasonAttendees)
      
      // Debug individual attendees structure
      if (individualAttendees.length > 0) {
        console.log('First individual attendee structure:', individualAttendees[0])
        console.log('Individual attendee players:', individualAttendees[0]?.players)
      }

      // Also fetch season attendees for this game (same logic as homepage)
      let seasonAttendeesData: ProcessedAttendee[] = []
      if (gameData?.season_id) {
        console.log('Season game detected, fetching season attendees like homepage...')
        
        try {
          // Fetch season attendees for this game's season (same as homepage)
          const { data: seasonAttendeesRaw, error: seasonError } = await supabase
            .from('season_attendees')
            .select(`
              id,
              created_at,
              player_id,
              players!inner (
                name,
                photo_url
              )
            `)
            .eq('season_id', gameData.season_id)
            .eq('payment_status', 'completed')

          if (!seasonError && seasonAttendeesRaw) {
            console.log('Season attendees fetched:', seasonAttendeesRaw)
            
            // Fetch season game attendance for this specific game
            const { data: seasonGameAttendance } = await supabase
              .from('season_game_attendance')
              .select('season_attendee_id, attendance_status')
              .eq('game_id', gameId)

            console.log('Season game attendance fetched:', seasonGameAttendance)

        // Combine season attendees with their attendance status for this game
        const seasonAttendeesWithStatus = seasonAttendeesRaw.map((attendee: { id: string; created_at: string; player_id: string; players: { name: string; photo_url?: string }[] }) => {
          const gameAttendance = seasonGameAttendance?.find((ga: { season_attendee_id: string; attendance_status: string }) => ga.season_attendee_id === attendee.id)
          return {
            id: attendee.id,
            created_at: attendee.created_at,
            player_id: attendee.player_id,
            payment_status: 'completed',
            attendance_status: gameAttendance?.attendance_status || 'attending',
            players: attendee.players?.[0] || { name: 'Unknown Player' }
          }
        })

            seasonAttendeesData = seasonAttendeesWithStatus
            console.log('Season attendees with status:', seasonAttendeesData)
          }
        } catch (err) {
          console.error('Error fetching season attendees:', err)
        }
      }

      // Use the exact same deduplication logic as the homepage
      const allAttendees = [...individualAttendees, ...seasonAttendeesData]
      const uniqueAttendees = allAttendees.filter((attendee, index, self) => {
        const attendeePlayerId = attendee.player_id
        
        // Find all attendees with the same player_id
        const duplicates = self.filter(a => a.player_id === attendeePlayerId)
        
        // If there are duplicates, prioritize season attendance (season attendees come after individual)
        if (duplicates.length > 1) {
          const hasSeasonAttendance = duplicates.some(d => d.payment_status === 'completed' && d.attendance_status)
          if (hasSeasonAttendance) {
            // Only keep the season attendance (last occurrence)
            return index === self.findLastIndex(a => a.player_id === attendeePlayerId)
          }
        }
        
        // If no duplicates or no season attendance, keep the first occurrence
        return index === self.findIndex(a => a.player_id === attendeePlayerId)
      })
      
      // Normalize the attendee data structure for display
      const normalizedAttendees = uniqueAttendees.map(attendee => {
        // Handle different player data structures
        let playerData = { name: 'Unknown Player' }
        
        if (attendee.players) {
          // If players is an array (from nested query), take the first one
          if (Array.isArray(attendee.players) && attendee.players.length > 0) {
            playerData = attendee.players[0]
          }
          // If players is an object (from direct query with !inner join)
          else if (typeof attendee.players === 'object' && attendee.players.name) {
            playerData = attendee.players
          }
        }
        
        return {
          id: attendee.id,
          created_at: attendee.created_at || new Date().toISOString(),
          player_id: attendee.player_id,
          attendance_status: attendee.attendance_status,
          payment_status: attendee.payment_status,
          players: playerData
        }
      })

      console.log('All attendees:', uniqueAttendees)
      console.log('Sample attendee players structure:', uniqueAttendees[0]?.players)
      console.log('Normalized attendees:', normalizedAttendees)
      setAttendees(normalizedAttendees as Attendee[])

      // Check user's attendance status if logged in
      console.log('Checking attendance - player:', !!player, 'user:', !!user)
      if (player || user) {
        const playerId = player?.id || user?.id
        console.log('Player ID:', playerId)
        if (playerId) {
          // Check individual game attendance
          const { data: userGameAttendance, error: gameAttendanceError } = await supabase
            .from('game_attendees')
            .select('payment_status, attendance_status')
            .eq('game_id', gameId)
            .eq('player_id', playerId)
            .eq('payment_status', 'completed')

          if (gameAttendanceError) {
            console.error('Error checking game attendance:', gameAttendanceError)
          } else {
            console.log('Individual game attendance query successful, data:', userGameAttendance)
          }

          if (userGameAttendance && userGameAttendance.length > 0) {
            console.log('Individual game attendance found:', userGameAttendance[0])
            setHasPaid(true)
            setUserAttendanceStatus(userGameAttendance[0].attendance_status || 'attending')
          } else if (gameData?.season_id) {
            // Check season attendance
            console.log('No individual game attendance found, checking season attendance for season ID:', gameData.season_id)
            const { data: seasonAttendee, error: seasonAttendeeError } = await supabase
              .from('season_attendees')
              .select('id')
              .eq('player_id', playerId)
              .eq('payment_status', 'completed')
              .eq('season_id', gameData.season_id)

            if (seasonAttendeeError) {
              console.error('Error checking season attendee:', seasonAttendeeError)
            }

            if (seasonAttendee && seasonAttendee.length > 0) {
              console.log('Season attendee found:', seasonAttendee[0])
              // Check specific game attendance within season
              const { data: seasonAttendance, error: seasonAttendanceError } = await supabase
                .from('season_game_attendance')
                .select('attendance_status')
                .eq('game_id', gameId)
                .eq('season_attendee_id', seasonAttendee[0].id)

              if (seasonAttendanceError) {
                console.error('Error checking season game attendance:', seasonAttendanceError)
                // If table doesn't exist, default to attending
                if (seasonAttendanceError.message?.includes('relation "season_game_attendance" does not exist')) {
                  console.log('season_game_attendance table not found, defaulting to attending')
                  setHasPaid(true)
                  setUserAttendanceStatus('attending')
                }
              } else if (seasonAttendance && seasonAttendance.length > 0) {
                console.log('Season game attendance found:', seasonAttendance[0])
                setHasPaid(true)
                setUserAttendanceStatus(seasonAttendance[0].attendance_status)
              } else {
                // User has purchased season but hasn't set attendance for this specific game
                console.log('Season attendee found, but no specific game attendance. Defaulting to attending.')
                setHasPaid(true)
                setUserAttendanceStatus('attending')
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Game not found')
    } finally {
      setLoading(false)
    }
  }, [gameId, player, user])

  const handleAttendanceStatusChange = (newStatus: 'attending' | 'not_attending') => {
    console.log('=== ATTENDANCE STATUS CHANGED ===', newStatus)
    setUserAttendanceStatus(newStatus)
    // Refresh the game details to update the attendees list
    console.log('Calling fetchGameDetails to refresh data...')
    // Force a refresh by calling the function directly
    setTimeout(() => {
      fetchGameDetails()
    }, 100) // Small delay to ensure the database update has completed
  }

  useEffect(() => {
    if (gameId) {
      console.log('useEffect triggered for gameId:', gameId)
      fetchGameDetails()
    }
  }, [gameId, fetchGameDetails])

  // Test state setters
  useEffect(() => {
    console.log('State changed - hasPaid:', hasPaid, 'userAttendanceStatus:', userAttendanceStatus)
  }, [hasPaid, userAttendanceStatus])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Check if the game has ended
  const isGameEnded = () => {
    if (!game) return false
    const gameDateTime = new Date(`${game.game_date}T${game.game_time}`)
    const now = new Date()
    return gameDateTime < now
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

// Removed unused getRandomGradient function

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading game details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="mb-4">
              <Image 
                src="/game.png" 
                alt="Game" 
                width={64} 
                height={64} 
                className="w-16 h-16 mx-auto"
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Game Not Found
            </h3>
            <p className="text-gray-600 mb-6">
              The game you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const attendingPlayers = attendees.filter(attendee => 
    attendee.attendance_status === 'attending' || !attendee.attendance_status
  )
  const totalAttendees = attendingPlayers.length
  const spotsLeft = game.total_tickets - totalAttendees
  const isFullyBooked = spotsLeft <= 0

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Main Content - Airbnb Style Layout */}
        <div className="max-w-7xl mx-auto pb-32 lg:pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Game Information */}
            <div className="lg:col-span-2 space-y-8">
              {/* Game Header */}
              <div>
                <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">{game.name}</h1>
                <Link href={`/groups/${game.groups.id}`} className="text-lg text-gray-600 mb-4 hover:text-blue-600 transition-colors">
                  {game.groups.name}
                </Link>
                
                {game.description && (
                  <p className="text-gray-700 text-base leading-relaxed">{game.description}</p>
                )}
              </div>

              {/* Game Details */}
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Game overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <Calendar className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Date</div>
                      <div className="text-gray-600">{formatDate(game.game_date)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Time</div>
                      <div className="text-gray-600">{formatTime(game.game_time)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Location</div>
                      <div className="text-gray-600">{game.location}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <DollarSign className="w-6 h-6 mr-4 text-gray-500 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Price</div>
                      <div className="text-gray-600">${game.price} per player</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Group - Only visible to users who have joined - Mobile Only */}
              {game.groups.whatsapp_group && hasPaid && (
                <div className="lg:hidden border-t border-gray-200 pt-8">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(game.groups.whatsapp_group, '_blank')}
                  >
                    Join WhatsApp Group
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Booking Card */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-8">
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                  {/* Price - Only show if user hasn't paid */}
                  {!hasPaid && (
                    <div className="mb-6">
                      <div className="flex items-baseline mb-2">
                        <span className="text-3xl font-bold text-gray-900">${game.price}</span>
                        <span className="text-gray-600 ml-2">per player</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {spotsLeft} of {game.total_tickets} spots available
                      </div>
                    </div>
                  )}

                  {/* Availability info for paid users */}
                  {hasPaid && (
                    <div className="mb-6">
                      <div className="text-sm text-gray-600">
                        {spotsLeft} of {game.total_tickets} spots available
                      </div>
                    </div>
                  )}

                  {/* Join Button or Attendance Toggle - Desktop Only */}
                  <div className="hidden lg:block">
                    {isGameEnded() ? (
                      <div className="w-full bg-gray-400 text-white py-3 px-4 rounded-lg text-center font-medium mb-6">
                        Closed
                      </div>
                    ) : hasPaid ? (
                      <div className="space-y-4 mb-6">
                        <AttendanceToggle
                          gameId={gameId}
                          seasonId={game.season_id}
                          playerId={player?.id || user?.id || ''}
                          currentStatus={userAttendanceStatus || 'not_attending'}
                          hasPaid={hasPaid}
                          isGameFull={isFullyBooked}
                          onStatusChange={handleAttendanceStatusChange}
                        />
                      </div>
                    ) : (
                      <Button 
                        className={`w-full mb-6 ${
                          isFullyBooked 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : ''
                        }`}
                        disabled={isFullyBooked}
                        size="lg"
                        onClick={() => setShowJoinModal(true)}
                      >
                        {isFullyBooked ? 'Fully Booked' : 'Join Game'}
                      </Button>
                    )}

                    {/* WhatsApp Group - Only visible to users who have joined */}
                    {game.groups.whatsapp_group && hasPaid && (
                      <Button
                        variant="outline"
                        className="w-full mb-6"
                        onClick={() => window.open(game.groups.whatsapp_group, '_blank')}
                      >
                        Join WhatsApp Group
                      </Button>
                    )}
                  </div>

                  {/* Game Attendees */}
                  {attendingPlayers.length > 0 && (
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Players Attending ({totalAttendees})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {attendingPlayers.map((attendee) => (
                          <div 
                            key={attendee.id} 
                            className="relative group"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer">
                              {attendee.players.photo_url ? (
                                <Image
                                  src={attendee.players.photo_url}
                                  alt={attendee.players.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-gray-600">
                                  {attendee.players.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                              {attendee.players.name}
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

      {/* Mobile Sticky Join/Attendance - Only visible on mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
        <div className="p-4">
          {isGameEnded() ? (
            <div className="w-full bg-gray-400 text-white py-3 px-4 rounded-lg text-center font-medium">
              Closed
            </div>
          ) : hasPaid ? (
            <AttendanceToggle
              gameId={gameId}
              seasonId={game.season_id}
              playerId={player?.id || user?.id || ''}
              currentStatus={userAttendanceStatus || 'not_attending'}
              hasPaid={hasPaid}
              isGameFull={isFullyBooked}
              onStatusChange={handleAttendanceStatusChange}
            />
          ) : (
            <Button 
              className={`w-full ${
                isFullyBooked 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : ''
              }`}
              disabled={isFullyBooked}
              size="lg"
              onClick={() => setShowJoinModal(true)}
            >
              {isFullyBooked ? 'Fully Booked' : 'Join Game'}
            </Button>
          )}
        </div>
      </div>

      {/* Join Modal */}
      <JoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        gameId={gameId}
        gameName={game.name}
        price={game.price}
      />
    </div>
  )
}
