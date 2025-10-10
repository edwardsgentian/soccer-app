'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Calendar, Clock, MapPin, DollarSign, ArrowLeft } from 'lucide-react'
import { JoinModal } from '@/components/join-flow/join-modal'
import { AttendanceToggle } from '@/components/attendance-toggle'
import { useAuth } from '@/contexts/auth-context'
import { AnimatedAvatarGroup } from '@/components/ui/animated-avatar-group'

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
    description?: string
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
    attendance_status?: 'attending' | 'not_attending'
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
      // Fetch game details
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          groups (
            name,
            whatsapp_group,
            description
          ),
          organizer:players!created_by (
            id,
            name,
            photo_url
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

      // Fetch individual game attendees
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

      if (attendeesError) {
        console.error('Error fetching attendees:', attendeesError)
      }

      // Transform individual game attendees
      const individualAttendees = (attendeesData || []).map((attendee: {
        id: string;
        created_at: string;
        attendance_status: string;
        players?: { name?: string; photo_url?: string }[];
      }) => ({
        id: attendee.id,
        created_at: attendee.created_at,
        attendance_status: attendee.attendance_status as 'attending' | 'not_attending',
        players: {
          name: attendee.players?.[0]?.name || 'Unknown Player',
          photo_url: attendee.players?.[0]?.photo_url
        }
      }))

      // If this is a season game, also fetch season attendees
      let seasonAttendees: Attendee[] = []
      if (gameData?.season_id) {
        try {
          // Fetch season attendees for this game's season
          const { data: seasonAttendeesData, error: seasonError } = await supabase
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

          if (!seasonError && seasonAttendeesData) {
            // Fetch season game attendance for this specific game
            const { data: seasonGameAttendance } = await supabase
              .from('season_game_attendance')
              .select('season_attendee_id, attendance_status')
              .eq('game_id', gameId)

            // Combine season attendees with their attendance status for this game
            seasonAttendees = seasonAttendeesData.map((attendee: {
              id: string;
              player_id: string;
              created_at: string;
              players?: { name?: string; photo_url?: string }[];
            }) => {
              const gameAttendance = seasonGameAttendance?.find(ga => ga.season_attendee_id === attendee.id)
              return {
                id: attendee.id,
                created_at: attendee.created_at,
                attendance_status: (gameAttendance?.attendance_status as 'attending' | 'not_attending') || 'attending',
                players: {
                  name: attendee.players?.[0]?.name || 'Unknown Player',
                  photo_url: attendee.players?.[0]?.photo_url
                }
              }
            })
          }
        } catch (err) {
          console.error('Error fetching season attendees:', err)
        }
      }

      // Combine individual game attendees with season attendees
      const allAttendees = [...individualAttendees, ...seasonAttendees]

      // Remove duplicates based on player_id (in case someone is both individual and season attendee)
      const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
        index === self.findIndex(a => a.players.name === attendee.players.name)
      )

      setAttendees(uniqueAttendees)

      // Check if user has paid and their attendance status
      if (player || user) {
        const playerId = player?.id || user?.id
        
        // Check individual game attendance
        const { data: userAttendee } = await supabase
          .from('game_attendees')
          .select('payment_status, attendance_status')
          .eq('game_id', gameId)
          .eq('player_id', playerId)
          .single()

        if (userAttendee) {
          setHasPaid(userAttendee.payment_status === 'completed')
          setUserAttendanceStatus(userAttendee.attendance_status || 'attending')
        } else if (gameData?.season_id) {
          // Check season attendance
          const { data: seasonAttendee } = await supabase
            .from('season_attendees')
            .select('id, payment_status')
            .eq('season_id', gameData.season_id)
            .eq('player_id', playerId)
            .single()

          if (seasonAttendee && seasonAttendee.payment_status === 'completed') {
            // Check specific game attendance for season
            const { data: seasonGameAttendance } = await supabase
              .from('season_game_attendance')
              .select('attendance_status')
              .eq('game_id', gameId)
              .eq('season_attendee_id', seasonAttendee.id)
              .single()

            if (seasonGameAttendance) {
              setHasPaid(true)
              setUserAttendanceStatus(seasonGameAttendance.attendance_status)
            } else {
              // User has purchased season but hasn't set attendance for this specific game
              setHasPaid(true)
              setUserAttendanceStatus('attending') // Default to attending
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
      fetchGameDetails()
    }
  }, [gameId, fetchGameDetails])

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


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
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
        <div className="container mx-auto px-4 py-16">
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
            <Button
              onClick={() => window.location.href = '/games'}
            >
              Back to Games
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Use actual attendee count from the fetched attendees data
  const attendingPlayers = attendees.filter(attendee => 
    attendee.attendance_status === 'attending' || !attendee.attendance_status
  )
  const totalAttendees = attendingPlayers.length
  const spotsLeft = game.total_tickets - totalAttendees
  const isFullyBooked = spotsLeft <= 0

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/games'}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </div>

        {/* Main Content - Airbnb Style Layout */}
        <div className="max-w-7xl mx-auto pb-32 lg:pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Game Information */}
            <div className="lg:col-span-2 space-y-8">
              {/* Game Header */}
              <div>
                <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">{game.name}</h1>
                <p className="text-lg font-semibold text-gray-600 mb-4">{game.groups.name}</p>
                
                {game.description && (
                  <p className="text-gray-700 text-base leading-relaxed">{game.description}</p>
                )}
              </div>

              {/* Game Details */}
              <div className="border-t border-gray-200 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-lg mr-4 mt-1 flex items-center justify-center" style={{ backgroundColor: '#F8F3BD' }}>
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Date</div>
                      <div className="text-gray-600">{formatDate(game.game_date)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-lg mr-4 mt-1 flex items-center justify-center" style={{ backgroundColor: '#F8F3BD' }}>
                      <Clock className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Time</div>
                      <div className="text-gray-600">{formatTime(game.game_time)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-lg mr-4 mt-1 flex items-center justify-center" style={{ backgroundColor: '#F8F3BD' }}>
                      <MapPin className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Location</div>
                      <div className="text-gray-600">{game.location}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-lg mr-4 mt-1 flex items-center justify-center" style={{ backgroundColor: '#F8F3BD' }}>
                      <DollarSign className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Price</div>
                      <div className="text-gray-600">${game.price} per player</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Join/Attendance */}
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

                {game.groups.whatsapp_group && (
                  <div className="mt-4">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full"
                    >
                      <a
                        href={game.groups.whatsapp_group}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Join WhatsApp Group
                      </a>
                    </Button>
                  </div>
                )}

                {/* Players Attending */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Players Attending ({totalAttendees})
                  </h3>
                  
                  {attendingPlayers.length === 0 ? (
                    <p className="text-gray-500 text-sm">No players are attending yet.</p>
                  ) : (
                    <AnimatedAvatarGroup
                      avatars={attendingPlayers.map((attendee) => ({
                        id: attendee.id,
                        name: attendee.players.name,
                        photo_url: attendee.players.photo_url,
                        fallback: attendee.players.name.charAt(0).toUpperCase()
                      }))}
                      maxVisible={8}
                      size="sm"
                      overlap={8}
                      hoverEffect="lift"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Join Modal */}
      <JoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        gameId={gameId}
        price={game?.price || 0}
        gameName={game?.name}
      />
    </div>
  )
}