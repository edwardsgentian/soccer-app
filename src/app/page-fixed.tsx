'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button";
import { HomepageGameCard } from "@/components/homepage-game-card";
import { SeasonCard } from "@/components/season-card";
import { Header } from "@/components/header";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from '@/lib/supabase'
import { GroupManagementModal } from '@/components/groups/group-management-modal'
import { fetchHomepageData, getCachedData, setCachedData } from '@/lib/optimized-queries'
import { GameCardSkeleton } from '@/components/ui/skeleton-loader'

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
  }
  seasons?: {
    id: string
    season_signup_deadline?: string
  }
  game_attendees?: Array<{
    id: string
    player_id: string
    payment_status: string
    attendance_status: string
    players: {
      name: string
      photo_url?: string
    }
  }>
  season_game_attendance?: Array<{
    id: string
    season_attendee_id: string
    attendance_status: string
    season_attendees: {
      id: string
      player_id: string
      payment_status: string
      players: {
        name: string
        photo_url?: string
      }
    }
  }>
}

interface Season {
  id: string
  name: string
  description?: string
  start_date: string
  end_date: string
  price: number
  total_tickets: number
  available_tickets: number
  created_at: string
  season_signup_deadline?: string
  groups: {
    name: string
    whatsapp_group?: string
  }
  season_attendees?: Array<{
    id: string
    player_id: string
    payment_status: string
    players: {
      name: string
      photo_url?: string
    }
  }>
}

export default function Home() {
  const { player } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Simple cache to avoid re-fetching data
  const [dataFetched, setDataFetched] = useState(false)

  const loadHomepageDataFallback = useCallback(async () => {
    try {
      // Simple fallback query
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          groups!inner (
            name,
            whatsapp_group
          ),
          seasons (
            id,
            season_signup_deadline
          )
        `)
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })
        .limit(6)

      const { data: seasons, error: seasonsError } = await supabase
        .from('seasons')
        .select(`
          *,
          groups!inner (
            name,
            whatsapp_group
          )
        `)
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(3)

      if (gamesError) console.error('Fallback games error:', gamesError)
      if (seasonsError) console.error('Fallback seasons error:', seasonsError)

      setGames((games as unknown as Game[]) || [])
      setSeasons((seasons as unknown as Season[]) || [])
    } catch (error) {
      console.error('Fallback query failed:', error)
      setGames([])
      setSeasons([])
    }
  }, [])

  useEffect(() => {
    if (!dataFetched) {
      loadHomepageData()
    }
  }, [dataFetched, loadHomepageData])

  const loadHomepageData = useCallback(async () => {
    try {
      // Check cache first
      const cacheKey = 'homepage-data'
      const cachedData = getCachedData(cacheKey)
      
      if (cachedData) {
        console.log('Using cached homepage data')
        setGames(cachedData.games || [])
        setSeasons(cachedData.seasons || [])
        setLoading(false)
        setDataFetched(true)
        return
      }

      console.log('Attempting optimized query...')
      setLoading(true)
      
      try {
        // Try optimized query first
        const result = await fetchHomepageData()
        console.log('Optimized query result:', result)
        
        if (result && (result.games?.length > 0 || result.seasons?.length > 0)) {
          setGames(result.games || [])
          setSeasons(result.seasons || [])
          
          // Cache the result
          setCachedData(cacheKey, result, 2 * 60 * 1000) // 2 minutes
        } else {
          console.log('No data from optimized query, using fallback')
          await loadHomepageDataFallback()
        }
      } catch (optimizedError) {
        console.error('Optimized query failed, using fallback:', optimizedError)
        await loadHomepageDataFallback()
      }
      
      setDataFetched(true)
      setLoading(false)
    } catch (error) {
      console.error('Error loading homepage data:', error)
      setLoading(false)
    }
  }, [loadHomepageDataFallback])

  return (
    <div className="min-h-screen bg-white">
      <div className="h-24" style={{background: 'linear-gradient(to bottom, #e2e8f0 0%, #ffffff 100%)'}}>
        <Header />
      </div>
      
      <div className="container mx-auto px-4 pt-8 py-16">
        {/* Hero Section */}
        <div className="relative mb-16">
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="relative max-w-6xl mx-auto">
              {/* Central Circle with Video */}
              <motion.div 
                className="relative w-96 h-96 mx-auto mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full shadow-2xl"></div>
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">⚽</span>
                    </div>
                    <h1 className="text-6xl font-medium text-gray-900 mb-4">
                      Find and join games in your area
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                      Connect with local soccer groups, join games, and be part of the community
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            <div className="text-center mb-8">
              <div className="w-full max-w-sm aspect-square mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full shadow-2xl"></div>
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">⚽</span>
                    </div>
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-medium text-gray-900 mb-4">
                Find and join games in your area
              </h1>
              <p className="text-lg text-gray-600 px-4">
                Connect with local soccer groups, join games, and be part of the community
              </p>
            </div>
          </div>
        </div>

        {/* Games and Seasons Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Upcoming Games & Seasons</h2>
            <p className="text-gray-600">Join games and seasons happening near you</p>
          </div>

          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <GameCardSkeleton key={index} />
              ))}
            </div>
          ) : games.length === 0 && seasons.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <Image 
                  src="/game.png" 
                  alt="No games" 
                  width={200} 
                  height={200} 
                  className="mx-auto opacity-50"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No upcoming games</h3>
              <p className="text-gray-500 mb-6">Be the first to create a game or season in your area!</p>
              {player && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Group
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group games by date */}
              {(() => {
                const gamesByDate = games.reduce((acc, game) => {
                  const date = game.game_date
                  if (!acc[date]) {
                    acc[date] = []
                  }
                  acc[date].push(game)
                  return acc
                }, {} as Record<string, Game[]>)

                return Object.entries(gamesByDate).map(([date, dateGames]) => (
                  <div key={date} className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <div className="space-y-4">
                      {dateGames.map((game) => (
                        <HomepageGameCard
                          key={game.id}
                          game={game}
                          gameId={game.id}
                          seasonId={game.season_id}
                          gameAttendees={game.game_attendees || []}
                          seasonGameAttendance={game.season_game_attendance || []}
                        />
                      ))}
                    </div>
                  </div>
                ))
              })()}

              {/* Seasons */}
              {seasons.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    Upcoming Seasons
                  </h3>
                  <div className="space-y-4">
                    {seasons.map((season) => (
                      <SeasonCard
                        key={season.id}
                        season={season}
                        seasonId={season.id}
                        seasonAttendees={season.season_attendees}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Group Management Modal */}
      <GroupManagementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={() => {
          // Optionally refresh data or redirect after group creation
          setShowCreateModal(false)
        }}
      />
    </div>
  );
}

