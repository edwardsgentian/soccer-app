'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GameManagementModal } from '@/components/games/game-management-modal'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Calendar, Clock, MapPin, Users, DollarSign, Eye, Ticket } from 'lucide-react'

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
  }
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          groups (
            name,
            whatsapp_group
          )
        `)
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })

      if (error) {
        console.error('Error fetching games:', error)
        return
      }

      setGames(data || [])
    } catch (err) {
      console.error('Error fetching games:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGameCreated = () => {
    fetchGames() // Refresh the games list
  }

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Upcoming Games
            </h1>
            <p className="text-gray-600">
              Find and join soccer games in your area
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Create Game
          </Button>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading games...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No upcoming games
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to create a game in your area!
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              Create First Game
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>

      <GameManagementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGameCreated={handleGameCreated}
      />
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  const isFullyBooked = game.available_tickets <= 0
  const spotsLeft = game.available_tickets
  const attendees = game.total_tickets - game.available_tickets

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Game Image Placeholder */}
      <div className="h-48 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
        <Ticket className="w-16 h-16 text-white opacity-80" />
      </div>

      <div className="p-6">
        {/* Group Name */}
        <div className="text-sm text-gray-500 mb-2">{game.groups.name}</div>
        
        {/* Game Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-3">{game.name}</h3>

        {/* Game Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{game.game_date}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>{game.game_time}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="truncate">{game.location}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>{attendees}/{game.total_tickets} players</span>
            {!isFullyBooked && (
              <span className="ml-2 text-sm text-blue-600">
                ({spotsLeft} spots left)
              </span>
            )}
          </div>
          
          <div className="flex items-center text-gray-600">
            <DollarSign className="w-4 h-4 mr-2" />
            <span className="font-semibold">${game.price}</span>
          </div>
        </div>

        {/* Description */}
        {game.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {game.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            asChild
            variant="outline" 
            className="flex-1"
            size="sm"
          >
            <Link href={`/games/${game.id}`}>
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Link>
          </Button>
          <Button 
            className={`flex-1 ${
              isFullyBooked 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            size="sm"
            disabled={isFullyBooked}
          >
            {isFullyBooked ? 'Fully Booked' : 'Buy Game'}
          </Button>
        </div>

        {/* WhatsApp Link */}
        {game.groups.whatsapp_group && (
          <div className="mt-4 pt-4 border-t">
            <Button
              asChild
              variant="outline"
              size="sm"
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
  )
}
