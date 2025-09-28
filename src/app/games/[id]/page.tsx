'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
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
          players (
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
      const attendeesData = directAttendees?.filter((att: any) => 
        att.payment_status === 'completed' &&
        (att.attendance_status === 'attending' || !att.attendance_status)
      ) || []

      // Also try filtering the nested results
      const nestedAttendeesData = gameWithNestedAttendees?.game_attendees?.filter((att: any) => 
        att.payment_status === 'completed' &&
        (att.attendance_status === 'attending' || !att.attendance_status)
      ) || []

      console.log('Direct filtered attendees:', attendeesData)
      console.log('Nested filtered attendees:', nestedAttendeesData)

      // Use the exact same processing logic as the homepage
      let individualAttendees = gameData?.game_attendees?.filter((att: any) => 
        att.payment_status === 'completed' && 
        (att.attendance_status === 'attending' || !att.attendance_status)
      ) || []
      
      // If the nested query didn't return individual attendees, try the direct query like the homepage does
      if (individualAttendees.length === 0 && directAttendees && directAttendees.length > 0) {
        console.log('Nested query returned no individual attendees, using direct query results')
        individualAttendees = directAttendees.filter((att: any) => 
          att.payment_status === 'completed' && 
          (att.attendance_status === 'attending' || !att.attendance_status)
        )
      }
      
      // Count season attendees who are attending this specific game
      const seasonAttendees = gameData?.season_game_attendance?.filter((att: any) => 
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
      let seasonAttendeesData: any[] = []
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
              players (
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
            const seasonAttendeesWithStatus = seasonAttendeesRaw.map((attendee: any) => {
              const gameAttendance = seasonGameAttendance?.find((ga: any) => ga.season_attendee_id === attendee.id)
              return {
                id: attendee.id,
                created_at: attendee.created_at,
                player_id: attendee.player_id,
                payment_status: 'completed',
                attendance_status: gameAttendance?.attendance_status || 'attending',
                players: attendee.players || { name: 'Unknown Player' }
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
        // All attendees now have the same structure
        return {
          id: attendee.id,
          created_at: attendee.created_at || new Date().toISOString(),
          player_id: attendee.player_id,
          attendance_status: attendee.attendance_status,
          payment_status: attendee.payment_status,
          players: attendee.players || { name: 'Unknown Player' }
        }
      })

      console.log('All attendees:', uniqueAttendees)
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

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getRandomGradient = () => {
    const gradients = [
      'from-stone-200 to-yellow-100',
      'from-stone-200 to-yellow-100',
      'from-stone-200 to-yellow-100',
      'from-stone-200 to-yellow-100',
      'from-stone-200 to-yellow-100'
    ]
    
    // Use gameId to consistently select the same gradient
    const hash = gameId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return gradients[Math.abs(hash) % gradients.length]
  }

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              {/* Game Header */}
              <div className="flex flex-col space-y-6 mb-8">
                {/* Game Icon */}
                <div className={`w-24 h-24 bg-gradient-to-br ${getRandomGradient()} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                    <Image 
                      src="/game.png" 
                      alt="Game" 
                      width={64} 
                      height={64} 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  </div>
                </div>

                {/* Game Info */}
                <div className="flex-1 text-left w-full">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{game.name}</h1>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-5 h-5 mr-3" />
                      <span className="font-medium">{formatDate(game.game_date)}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-5 h-5 mr-3" />
                      <span className="font-medium">{formatTime(game.game_time)}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-5 h-5 mr-3" />
                      <span className="font-medium">{game.location}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-5 h-5 mr-3" />
                      <span className="font-medium">${game.price} per player</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {game.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Game</h3>
                  <p className="text-gray-600">{game.description}</p>
                </div>
              )}

              {/* Attendees */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Players Attending ({totalAttendees}/{game.total_tickets})
                </h3>
                
                {attendingPlayers.length === 0 ? (
                  <p className="text-gray-500">No players are attending yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attendingPlayers.map((attendee) => (
                      <div key={attendee.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-semibold text-sm">
                            {attendee.players.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-gray-900 font-medium">{attendee.players.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {hasPaid ? 'Your Attendance' : 'Join This Game'}
              </h3>
              
              <div className="space-y-4 mb-6">
                {!hasPaid && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Price per player:</span>
                    <span className="font-semibold text-lg">${game.price}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Available spots:</span>
                  <span className={`font-semibold ${isFullyBooked ? 'text-red-600' : 'text-green-600'}`}>
                    {isFullyBooked ? 'Fully booked' : `${spotsLeft} left`}
                  </span>
                </div>
              </div>

              {hasPaid ? (
                <div className="space-y-4">
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
                  className={`w-full ${
                    isFullyBooked 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : ''
                  }`}
                  disabled={isFullyBooked}
                  size="lg"
                  onClick={() => setShowJoinModal(true)}
                >
                  {isFullyBooked ? 'Fully Booked' : 'Join Game - $' + game.price}
                </Button>
              )}

              {/* WhatsApp Group */}
              {game.groups.whatsapp_group && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => window.open(game.groups.whatsapp_group, '_blank')}
                >
                  Join WhatsApp Group
                </Button>
              )}
            </div>
          </div>
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
