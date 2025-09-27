'use client'

import { useState, useEffect, useCallback } from 'react'
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
      
      // Fetch game details
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
          )
        `)
        .eq('id', gameId)
        .single()

      if (gameError) {
        throw gameError
      }

      setGame(gameData)

      // Fetch attendees (both individual and season attendees)
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('game_attendees')
        .select(`
          id,
          created_at,
          attendance_status,
          players (
            name,
            photo_url
          )
        `)
        .eq('game_id', gameId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: true })

      // Also fetch season attendees for this game
      let seasonAttendeesData: Attendee[] = []
      if (gameData?.season_id) {
        const { data: seasonAttendees, error: seasonAttendeesError } = await supabase
          .from('season_attendees')
          .select(`
            id,
            created_at,
            players (
              name,
              photo_url
            )
          `)
          .eq('season_id', gameData.season_id)
          .eq('payment_status', 'completed')

        if (!seasonAttendeesError && seasonAttendees) {
          // Get specific game attendance for season attendees
          const { data: seasonGameAttendance } = await supabase
            .from('season_game_attendance')
            .select('season_attendee_id, attendance_status')
            .eq('game_id', gameId)

          // Combine season attendees with their game attendance status
          seasonAttendeesData = seasonAttendees.map(attendee => {
            const gameAttendance = seasonGameAttendance?.find(ga => ga.season_attendee_id === attendee.id)
            return {
              id: attendee.id,
              created_at: attendee.created_at,
              attendance_status: gameAttendance?.attendance_status || 'attending', // Default to attending
              players: attendee.players[0] || { name: 'Unknown Player' }
            }
          })
        }
      }

      if (attendeesError) {
        console.error('Error fetching attendees:', attendeesError)
      } else {
        // Combine individual game attendees with season attendees
        const allAttendees = [
          ...(attendeesData || []),
          ...seasonAttendeesData
        ]
        
        // Remove duplicates (in case someone is both an individual and season attendee)
        const uniqueAttendees = allAttendees.filter((attendee, index, self) => 
          index === self.findIndex(a => {
            const attendeeName = Array.isArray(a.players) ? a.players[0]?.name : a.players?.name
            const currentName = Array.isArray(attendee.players) ? attendee.players[0]?.name : attendee.players?.name
            return attendeeName === currentName
          })
        )
        
        setAttendees(uniqueAttendees as Attendee[])
      }

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
              <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
                {/* Game Icon */}
                <div className={`w-24 h-24 bg-gradient-to-br ${getRandomGradient()} rounded-lg flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0`}>
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
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{game.name}</h1>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600 justify-center sm:justify-start">
                      <Calendar className="w-5 h-5 mr-3" />
                      <span className="font-medium">{formatDate(game.game_date)}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 justify-center sm:justify-start">
                      <Clock className="w-5 h-5 mr-3" />
                      <span className="font-medium">{formatTime(game.game_time)}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 justify-center sm:justify-start">
                      <MapPin className="w-5 h-5 mr-3" />
                      <span className="font-medium">{game.location}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 justify-center sm:justify-start">
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
                    onStatusChange={setUserAttendanceStatus}
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
