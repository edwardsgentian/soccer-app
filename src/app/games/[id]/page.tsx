'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { fetchGameDetails as fetchOptimizedGameDetails } from '@/lib/optimized-queries'
import { Header } from '@/components/header'
import { Calendar, Clock, MapPin, DollarSign, ArrowLeft } from 'lucide-react'
import { JoinModal } from '@/components/join-flow/join-modal'
import { AttendanceToggle } from '@/components/attendance-toggle'
import { useAuth } from '@/contexts/auth-context'

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
  const [hasAccess, setHasAccess] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)

  const handleStatusChange = async (status: 'attending' | 'not_attending') => {
    setUserAttendanceStatus(status)
    // Refresh the game details to update the attendees list
    await fetchGameDetails()
  }

  const fetchGameDetails = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      // Use the optimized function to fetch game details
      const gameData = await fetchOptimizedGameDetails(gameId)
      
      if (!gameData) {
        throw new Error('Game not found')
      }


      setGame(gameData)

      // Process attendees from the optimized data
      const individualAttendees = (gameData.game_attendees || []).map((attendee: any) => {
        const player = Array.isArray(attendee.players) ? attendee.players[0] : attendee.players
        
        return {
          id: attendee.id,
          created_at: attendee.created_at || new Date().toISOString(),
          attendance_status: attendee.attendance_status as 'attending' | 'not_attending',
          players: {
            name: player?.name || 'Unknown Player',
            photo_url: player?.photo_url
          }
        }
      })

      // Process season attendees
      const seasonAttendees = (gameData.season_game_attendance || []).map((attendance: any) => {
        const attendee = attendance.season_attendees
        const player = Array.isArray(attendee.players) ? attendee.players[0] : attendee.players
        
        return {
          id: attendee.id,
          created_at: attendee.created_at || new Date().toISOString(),
          attendance_status: attendance.attendance_status as 'attending' | 'not_attending',
          players: {
            name: player?.name || 'Unknown Player',
            photo_url: player?.photo_url
          }
        }
      })

      // Combine all attendees
      const allAttendees = [...individualAttendees, ...seasonAttendees]

      // Remove duplicates based on player_id (in case someone is both individual and season attendee)
      const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
        index === self.findIndex(a => a.players.name === attendee.players.name)
      )

      setAttendees(uniqueAttendees)

      // Check if user has paid and their attendance status using optimized data
      if (player || user) {
        const playerId = player?.id || user?.id
        
        
        // Check individual game attendance
        const userAttendee = gameData.game_attendees?.find((attendee: any) => 
          attendee.player_id === playerId && attendee.payment_status === 'completed'
        )

        if (userAttendee) {
          setHasPaid(userAttendee.payment_status === 'completed')
          setUserAttendanceStatus(userAttendee.attendance_status || 'attending')
          setHasAccess(true) // User is signed up for individual game
        } else if (gameData?.season_id) {
          // Check season attendance
          const seasonAttendee = (gameData.season_game_attendance as any)?.find((attendance: any) => 
            attendance.season_attendees?.player_id === playerId && attendance.season_attendees?.payment_status === 'completed'
          )

          if (seasonAttendee) {
            setHasPaid(true)
            setUserAttendanceStatus(seasonAttendee.attendance_status || 'attending')
            setHasAccess(true) // User is signed up for season
          } else {
            setHasAccess(false) // User is not signed up for season
          }
        } else {
          setHasAccess(false) // User is not signed up for individual game and no season
        }
      } else {
        setHasAccess(false) // No user logged in
      }
      
      setAccessChecked(true)
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

                {hasAccess ? (
                  <div className="space-y-4">
                    <AttendanceToggle
                      gameId={gameId}
                      seasonId={game.season_id}
                      playerId={player?.id || user?.id || ''}
                      currentStatus={userAttendanceStatus || 'not_attending'}
                      hasPaid={hasPaid}
                      isGameFull={isFullyBooked}
                      onStatusChange={handleStatusChange}
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

                {game.groups.whatsapp_group && hasAccess && (
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
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            {attendee.players.name}
                          </div>
                        </div>
                      ))}
                    </div>
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