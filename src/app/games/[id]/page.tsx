'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Calendar, Clock, MapPin, DollarSign, ArrowLeft, Ticket } from 'lucide-react'
import { PaymentModal } from '@/components/payment/payment-modal'

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
  groups: {
    name: string
    whatsapp_group?: string
    description?: string
  }
}

interface Attendee {
  id: string
  created_at: string
  players: {
    name: string
    photo_url?: string
  }
}

export default function GameDetailPage() {
  const params = useParams()
  const gameId = params.id as string
  
  const [game, setGame] = useState<Game | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

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
          )
        `)
        .eq('id', gameId)
        .single()

      if (gameError) {
        throw gameError
      }

      setGame(gameData)

      // Fetch attendees
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('game_attendees')
        .select(`
          id,
          created_at,
          players (
            name,
            photo_url
          )
        `)
        .eq('game_id', gameId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: true })

      if (attendeesError) {
        console.error('Error fetching attendees:', attendeesError)
      } else {
        setAttendees((attendeesData as unknown as Attendee[]) || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Game not found')
    } finally {
      setLoading(false)
    }
  }, [gameId])

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
            <div className="text-6xl mb-4">⚽</div>
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

  const isFullyBooked = game.available_tickets <= 0
  const spotsLeft = game.available_tickets
  const totalAttendees = game.total_tickets - game.available_tickets

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => window.location.href = '/games'}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Game Image */}
              <div className="h-48 bg-gray-50 flex items-center justify-center">
                <Ticket className="w-12 h-12 text-gray-400" />
              </div>

              <div className="p-6">
                {/* Group Name */}
                <div className="text-sm text-gray-500 mb-2">{game.groups.name}</div>
                
                {/* Game Name */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{game.name}</h1>


                {/* Game Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

                {/* Description */}
                {game.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Game</h3>
                    <p className="text-gray-600">{game.description}</p>
                  </div>
                )}

                {/* Group Description */}
                {game.groups.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About {game.groups.name}</h3>
                    <p className="text-gray-600">{game.groups.description}</p>
                  </div>
                )}

                {/* Attendees */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Players Attending ({totalAttendees}/{game.total_tickets})
                  </h3>
                  
                  {attendees.length === 0 ? (
                    <p className="text-gray-500">No players have signed up yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attendees.map((attendee) => (
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
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Join This Game</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Price per player:</span>
                  <span className="font-semibold text-lg">${game.price}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Available spots:</span>
                  <span className={`font-semibold ${isFullyBooked ? 'text-red-600' : 'text-green-600'}`}>
                    {isFullyBooked ? 'Fully booked' : `${spotsLeft} left`}
                  </span>
                </div>
              </div>

              <Button 
                className={`w-full ${
                  isFullyBooked 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : ''
                }`}
                disabled={isFullyBooked}
                size="lg"
                onClick={() => !isFullyBooked && setShowPaymentModal(true)}
              >
                {isFullyBooked ? 'Fully Booked' : 'Buy Game - $' + game.price}
              </Button>

              {game.groups.whatsapp_group && (
                <div className="mt-4 pt-4 border-t">
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
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        game={game}
        onSuccess={() => {
          // Refresh game details after successful payment
          fetchGameDetails()
        }}
      />
    </div>
  )
}
