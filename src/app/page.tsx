'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button";
import { HomepageGameCard } from "@/components/homepage-game-card";
import { SeasonCard } from "@/components/season-card";
import { Header } from "@/components/header";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from '@/lib/supabase'
import { GroupManagementModal } from '@/components/groups/group-management-modal'
import { HomepageGameCardSkeleton, HomepageSeasonCardSkeleton } from '@/components/ui/skeleton-loader'
import { fetchGamesWithAttendance, fetchSeasonsWithAttendance, isUserAttendingGame, isUserAttendingSeason, getSeasonPlayerCount } from '@/lib/attendance-service'

// Use the types from the attendance service
import type { GameWithAttendance, SeasonWithAttendance } from '@/lib/attendance-service'

type Game = GameWithAttendance

type Season = SeasonWithAttendance

// SplitText component for word-by-word animation
const SplitText = ({ children, className = "" }: { children: string; className?: string }) => {
  const words = children.split(" ")

  return (
    <span className={className}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: "easeOut"
          }}
          className="inline-block mr-2"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

export default function Home() {
  const { player } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      console.log('Starting to load homepage data...')
      setLoading(true)
      try {
        await Promise.all([
          fetchUpcomingGames(),
          fetchUpcomingSeasons()
        ])
        console.log('Homepage data loaded successfully')
      } catch (error) {
        console.error('Error loading homepage data:', error)
      } finally {
        console.log('Setting loading to false')
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Debug logging
  useEffect(() => {
    console.log('State update - loading:', loading, 'games:', games.length, 'seasons:', seasons.length)
  }, [loading, games, seasons, player])

  const fetchUpcomingGames = async () => {
    if (!supabase) {
      console.log('Supabase not available')
      return
    }

    try {
      // Start with a very simple query to test
      console.log('Fetching games with date filter:', new Date().toISOString().split('T')[0])
      
      // Use the centralized attendance service
      const games = await fetchGamesWithAttendance({
        dateFrom: new Date().toISOString().split('T')[0],
        limit: 6
      })

      setGames(games)
      return

    } catch (err) {
      console.error('Error fetching games:', err)
      console.error('Games fetch error details:', JSON.stringify(err, null, 2))
      setGames([]) // Set empty array on error
    }
  }

  const fetchUpcomingSeasons = async () => {
    console.log('fetchUpcomingSeasons called')
    if (!supabase) {
      console.log('Supabase not available for seasons')
      return
    }

    try {
      console.log('Calling fetchSeasonsWithAttendance...')
      // Use the centralized attendance service
      const seasons = await fetchSeasonsWithAttendance({
        dateFrom: new Date().toISOString().split('T')[0],
        limit: 3
      })

      console.log('Fetched seasons for homepage:', {
        seasonsCount: seasons.length,
        seasons: seasons.map(s => ({
          id: s.id,
          name: s.name,
          seasonAttendeesCount: s.season_attendees?.length || 0,
          seasonAttendees: s.season_attendees
        }))
      })

      setSeasons(seasons)
    } catch (err) {
      console.error('Error fetching seasons:', err)
      setSeasons([])
    }
  }
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
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              >
                <div className="w-full h-full rounded-full overflow-hidden">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  >
                    <source src="/clouds_sports.mp4" type="video/mp4" />
                  </video>
                </div>
              </motion.div>

              {/* Positioned Text Elements */}
              {/* Community - Top Left, locked with logo */}
              <div className="absolute" style={{ top: '50px', left: '0px' }}>
                <h1 className="hero-h1 text-6xl font-serif text-gray-900 leading-none">
                  <SplitText>Community</SplitText>
                </h1>
              </div>

              {/* Sports - Bottom Left, locked with circle */}
              <div className="absolute" style={{ top: '130px', left: '210px' }}>
                <h1 className="hero-h1 text-6xl font-serif text-gray-900 leading-none">
                  <SplitText>sports</SplitText>
                </h1>
              </div>

              {/* Games - Top Right, locked with circle */}
              <div className="absolute" style={{ top: '130px', right: '210px' }}>
                <h1 className="hero-h1 text-6xl font-serif text-gray-900 leading-none">
                  <SplitText>games</SplitText>
                </h1>
              </div>

              {/* Starts Here - Bottom Right, locked with circle */}
              <div className="absolute" style={{ top: '210px', right: '50px' }}>
                <h1 className="hero-h1 text-6xl font-serif font-medium bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent leading-none">
                  <SplitText>starts here</SplitText>
                </h1>
              </div>

              {/* Subtext and Button - Below Circle */}
              <motion.div 
                className="text-center mt-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
              >
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Create a group or find games near you
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                >
                  Create a group
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            <div className="text-center">
              {/* Mobile Text Layout */}
              <div className="space-y-2 mb-6">
                <h1 className="hero-h1 text-6xl font-serif text-gray-900">
                  <SplitText>Community</SplitText>
                </h1>
                <h1 className="hero-h1 text-6xl font-serif text-gray-900">
                  <SplitText>sports games</SplitText>
                </h1>
                <h1 className="hero-h1 text-6xl font-serif font-medium bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                  <SplitText>starts here</SplitText>
                </h1>
              </div>

              {/* Mobile Subtext and Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
              >
                <p className="text-gray-600 mb-6 px-4">
                  Create a group or find games near you
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mb-8 text-sm md:text-base"
                >
                  Create a group
                </Button>
              </motion.div>

              {/* Mobile Video Circle */}
              <div className="w-full px-4">
                <motion.div 
                  className="w-full max-w-sm aspect-square mx-auto mt-8"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    >
                      <source src="/clouds_sports.mp4" type="video/mp4" />
                    </video>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Games Section */}
        <div className="mb-8 md:mb-12" style={{ marginTop: '-20px' }}>
          
          {/* Game Cards Grid */}
          {loading ? (
            <div className="space-y-6">
              {/* Show skeleton cards for seasons first */}
              <div className="max-w-lg mx-auto mb-6 md:mb-8 mt-12 md:mt-24 space-y-4 md:space-y-6 px-4">
                <HomepageSeasonCardSkeleton />
                <HomepageSeasonCardSkeleton />
              </div>
              
              {/* Show skeleton cards for games */}
              <div className="max-w-lg mx-auto space-y-4 md:space-y-6 px-4">
                <HomepageGameCardSkeleton />
                <HomepageGameCardSkeleton />
                <HomepageGameCardSkeleton />
              </div>
            </div>
          ) : games.length === 0 && seasons.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <Image 
                  src="/game.png" 
                  alt="Game" 
                  width={64} 
                  height={64} 
                  className="w-16 h-16 mx-auto rounded-full object-cover"
                />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                No upcoming games or seasons yet
              </h3>
              <p className="text-sm md:text-base text-gray-600 mb-6 px-4">
                Be the first to create a game or season in your area!
              </p>
              <Button
                onClick={() => window.location.href = '/groups'}
                className="text-sm md:text-base"
              >
                Create a Group
              </Button>
            </div>
          ) : (
            <>
              {/* Seasons Section */}
              {seasons.length > 0 && (
                <div className="max-w-lg mx-auto mb-6 md:mb-8 mt-12 md:mt-24 space-y-4 md:space-y-6 px-4">
                    {seasons.map((season) => {
                      // Use the centralized attendance service
                      const attendanceInfo = player ? isUserAttendingSeason(season, player.id) : { isAttending: false, hasPaid: false }
                      const playerCount = getSeasonPlayerCount(season)
                      
                      const seasonSpotsAvailable = season.season_spots - playerCount
                      const gameSpotsAvailable = season.game_spots
                      
                      return (
                        <SeasonCard
                          key={season.id}
                          seasonId={season.id}
                          seasonName={season.name}
                          description={season.description}
                          seasonPrice={season.season_price}
                          individualGamePrice={season.individual_game_price}
                          totalGames={season.total_games}
                          seasonSpots={season.season_spots}
                          gameSpots={season.game_spots}
                          firstGameDate={season.first_game_date}
                          firstGameTime={season.first_game_time}
                          repeatType={season.repeat_type}
                          groupName={season.groups?.name || 'Unknown Group'}
                          location={season.location}
                          seasonSpotsAvailable={seasonSpotsAvailable}
                          gameSpotsAvailable={gameSpotsAvailable}
                          isUserAttending={attendanceInfo.isAttending}
                        />
                      )
                    })}
                </div>
              )}

              {/* Games Section */}
              {games.length > 0 && (
                <div className="max-w-lg mx-auto space-y-4 md:space-y-6 px-4">
                {(() => {
                  // Group games by date
                  const gamesByDate = games.reduce((acc, game) => {
                    const date = new Date(game.game_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })
                    if (!acc[date]) {
                      acc[date] = []
                    }
                    acc[date].push(game)
                    return acc
                  }, {} as Record<string, typeof games>)

                  return Object.entries(gamesByDate).map(([date, dateGames]) => (
                    <div key={date}>
                      {/* Date Label */}
                      <div className="text-center mb-4">
                        <h3 className="text-sm text-gray-600">
                          {date}
                        </h3>
                      </div>
                      
                      {/* Games for this date */}
                      <div className="space-y-4">
                        {dateGames.map((game) => {
                          // Use the centralized attendance service
                          const attendanceInfo = player ? isUserAttendingGame(game, player.id) : { isAttending: false, hasPaid: false }
                          // const playerCount = getGamePlayerCount(game)
                          

                          return (
                            <HomepageGameCard
                              key={game.id}
                              gameName={game.name}
                              time={game.game_time}
                              price={game.price}
                              location={game.location}
                              maxAttendees={game.total_tickets}
                              groupName={Array.isArray(game.groups) ? game.groups[0]?.name : game.groups?.name || 'Unknown Group'}
                              gameId={game.id}
                              tags={['Intermediate', 'Outdoors']}
                              seasonId={game.season_id || game.seasons?.id}
                              seasonSignupDeadline={game.seasons?.season_signup_deadline}
                              isUserAttending={attendanceInfo.isAttending}
                              hasPurchasedSeason={attendanceInfo.hasPaid}
                              gameAttendees={game.game_attendees}
                              seasonGameAttendance={game.season_game_attendance}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
                </div>
              )}

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
        <div className="p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-2 max-w-2xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-w-xs mx-auto">
                <div className="w-24 h-24 bg-green-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  <Image 
                    src="/card.png" 
                    alt="Card" 
                    width={96} 
                    height={96} 
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Payments made easy</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Upfront or per game, no more keeping track of who&apos;s paid
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-w-xs mx-auto">
                <div className="w-24 h-24 bg-blue-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  <Image 
                    src="/checklist.png" 
                    alt="Checklist" 
                    width={96} 
                    height={96} 
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Attendance tracking</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Know exactly how many players are coming
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-w-xs mx-auto">
                <div className="w-24 h-24 bg-purple-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  <Image 
                    src="/season.png" 
                    alt="Season" 
                    width={96} 
                    height={96} 
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Season setup</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Setup your season in one go, set prices for seasons and games
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-w-xs mx-auto">
                <div className="w-24 h-24 bg-orange-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  <Image 
                    src="/whatsapp.png" 
                    alt="WhatsApp" 
                    width={96} 
                    height={96} 
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Made to work with WhatsApp</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Operational bridge with where you already run your existing community
                </p>
              </div>
          </div>
        </div>
      </div>

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