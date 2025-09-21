'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/game-card";
import { Header } from "@/components/header";
import { supabase } from '@/lib/supabase'

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

export default function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingGames()
  }, [])

  const fetchUpcomingGames = async () => {
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
        .limit(6) // Show only the first 6 upcoming games on homepage

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            ⚽ Women&apos;s Soccer Meetups
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join pickup soccer games in New York. Connect with fellow players, 
            improve your skills, and have fun on the field.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => window.location.href = '/games'}
            >
              Find Games Near You
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.location.href = '/groups'}
            >
              Create a Group
            </Button>
          </div>
        </div>

        {/* Upcoming Games Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Upcoming Games
            </h2>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/games'}
            >
              View All Games
            </Button>
          </div>
          
          {/* Game Cards Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading upcoming games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No upcoming games yet
              </h3>
              <p className="text-gray-600 mb-6">
                Be the first to create a game in your area!
              </p>
              <Button
                onClick={() => window.location.href = '/groups'}
                className="bg-green-600 hover:bg-green-700"
              >
                Create a Group
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => {
                const attendees = game.total_tickets - game.available_tickets
                return (
                  <GameCard 
                    key={game.id}
                    gameName={game.name}
                    date={game.game_date}
                    time={game.game_time}
                    price={game.price}
                    location={game.location}
                    attendees={attendees}
                    maxAttendees={game.total_tickets}
                    groupName={game.groups.name}
                    gameId={game.id}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Games</h3>
              <p className="text-gray-600">
                Browse upcoming soccer games in your area. See details like 
                location, time, price, and who&apos;s attending.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Book & Pay</h3>
              <p className="text-gray-600">
                Secure your spot with a quick payment. No account required - 
                just enter your details and pay with your card.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚽</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Play & Connect</h3>
              <p className="text-gray-600">
                Show up and play! Meet new people, improve your skills, 
                and join the community WhatsApp group.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
