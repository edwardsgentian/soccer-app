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
    <div className="min-h-screen bg-white">
      <div className="h-24" style={{background: 'linear-gradient(to bottom, #e2e8f0 0%, #ffffff 100%)'}}>
        <Header />
      </div>
      
      <div className="container mx-auto px-4 pt-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-8 leading-tight">
            Community<br />
            soccer games<br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent" style={{WebkitBackgroundClip: 'text', backgroundClip: 'text'}}>
              start here.
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Create a game or find fun, soccer groups near you.
          </p>
        </div>

        {/* Upcoming Games Section */}
        <div className="mb-12">
          
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
              >
                Create a Group
              </Button>
            </div>
          ) : (
            <>
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
              
              {/* View All Games Button - Centered below tiles */}
              <div className="text-center mt-8">
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/games'}
                >
                  View All Games
                </Button>
              </div>
            </>
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
