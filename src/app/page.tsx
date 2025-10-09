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
    season_signup_deadline: string
  }
  game_attendees?: {
    id: string
    player_id: string
    payment_status: string
  }[]
  season_attendees?: {
    id: string
    player_id: string
    payment_status: string
  }[]
  season_game_attendance?: {
    attendance_status: 'attending' | 'not_attending'
    season_attendees: {
      id: string
      player_id: string
      payment_status: string
    }
  }[]
}

interface Season {
  id: string
  name: string
  description?: string
  season_price: number
  individual_game_price: number
  total_games: number
  season_spots: number
  game_spots: number
  first_game_date: string
  first_game_time: string
  repeat_type: string
  location: string
  groups: {
    name: string
    whatsapp_group?: string
  }
  season_attendees?: {
    id: string
    player_id: string
    payment_status: string
  }[]
  season_game_attendance?: {
    attendance_status: 'attending' | 'not_attending'
    season_attendees: {
      id: string
      player_id: string
      payment_status: string
    }
  }[]
}

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
    fetchUpcomingGames()
    fetchUpcomingSeasons()
  }, [])

  const fetchUpcomingGames = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      // First, get all upcoming games
      const { data: allGames, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          groups (
            name,
            whatsapp_group
          ),
          seasons (
            id,
            season_signup_deadline
          ),
          game_attendees (
            id,
            player_id,
            payment_status,
            attendance_status
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
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })

      if (gamesError) {
        console.error('Error fetching games:', gamesError)
        setGames([]) // Set empty array on error
      } else {
        // For each game, if it's part of a season, fetch season attendees
        const gamesWithSeasonAttendees = await Promise.all(
          (allGames || []).map(async (game) => {
            if (game.season_id) {
              try {
                // Fetch season attendees for this game's season
                const { data: seasonAttendees, error: seasonError } = await supabase
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
                  .eq('season_id', game.season_id)
                  .eq('payment_status', 'completed')

                if (!seasonError && seasonAttendees) {
                  // Fetch season game attendance for this specific game
                  const { data: seasonGameAttendance } = await supabase
                    .from('season_game_attendance')
                    .select('season_attendee_id, attendance_status')
                    .eq('game_id', game.id)

                  // Combine season attendees with their attendance status for this game
                  const seasonAttendeesWithStatus = seasonAttendees.map(attendee => {
                    const gameAttendance = seasonGameAttendance?.find(ga => ga.season_attendee_id === attendee.id)
                    return {
                      id: attendee.id,
                      player_id: attendee.player_id, // Use actual player_id
                      payment_status: 'completed',
                      attendance_status: gameAttendance?.attendance_status || 'attending'
                    }
                  })

                  // Combine individual game attendees with season attendees
                  const allAttendees = [
                    ...(game.game_attendees || []),
                    ...seasonAttendeesWithStatus
                  ]

                  // Remove duplicates based on player_id (in case someone is both individual and season attendee)
                  const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
                    index === self.findIndex(a => a.player_id === attendee.player_id)
                  )

                  return {
                    ...game,
                    game_attendees: uniqueAttendees,
                    season_attendees: seasonAttendees // Store season attendees for hasPurchasedSeason calculation
                  }
                }
              } catch (err) {
                console.error('Error fetching season attendees for game:', game.id, err)
              }
            }
            return game
          })
        )
        
        setGames(gamesWithSeasonAttendees.slice(0, 6)) // Show only the first 6 games
      }
    } catch (err) {
      console.error('Error fetching games:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcomingSeasons = async () => {
    if (!supabase) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('seasons')
        .select(`
          *,
          groups (
            name,
            whatsapp_group
          ),
          season_attendees (
            id,
            player_id,
            payment_status
          )
        `)
        .gte('first_game_date', new Date().toISOString().split('T')[0])
        .order('first_game_date', { ascending: true })
        .limit(3) // Show only the first 3 upcoming seasons on homepage

      if (error) {
        console.error('Error fetching seasons:', error)
        setSeasons([]) // Set empty array on error
      } else {
        setSeasons(data || [])
      }
    } catch (err) {
      console.error('Error fetching seasons:', err)
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
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
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
              <div className="space-y-2 mb-8">
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
                <p className="text-lg text-gray-600 mb-6 px-4">
                  Create a group or find games near you
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mb-8"
                >
                  Create a group
                </Button>
              </motion.div>

              {/* Mobile Video Circle */}
              <motion.div 
                className="w-96 h-96 mx-auto mt-12"
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

        {/* Upcoming Games Section */}
        <div className="mb-12" style={{ marginTop: '-50px' }}>
          
          {/* Game Cards Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading upcoming games...</p>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No upcoming games or seasons yet
              </h3>
              <p className="text-gray-600 mb-6">
                Be the first to create a game or season in your area!
              </p>
              <Button
                onClick={() => window.location.href = '/groups'}
              >
                Create a Group
              </Button>
            </div>
          ) : (
            <>
              {/* Seasons Section */}
              {seasons.length > 0 && (
                <div className="max-w-lg mx-auto mb-8 mt-24 space-y-6">
                    {seasons.map((season) => {
                      // Calculate season attendees including organizer if they should be included
                      const seasonAttendees = season.season_attendees?.filter(att => att.payment_status === 'completed').length || 0
                      
                      const seasonSpotsAvailable = season.season_spots - seasonAttendees
                      const gameSpotsAvailable = season.game_spots // Individual game spots (not affected by season signups)
                      
                      // Check if current user is attending this season
                      const isUserAttending = season.season_attendees?.some(att => 
                        att.payment_status === 'completed' && att.player_id === player?.id
                      ) || false
                      
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
                          groupName={season.groups.name}
                          location={season.location}
                          seasonSpotsAvailable={seasonSpotsAvailable}
                          gameSpotsAvailable={gameSpotsAvailable}
                          isUserAttending={isUserAttending}
                        />
                      )
                    })}
                </div>
              )}

              {/* Games Section */}
              {games.length > 0 && (
                <div className="max-w-lg mx-auto space-y-6">
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
                          
                          // Check if current user is attending this game
                          const isUserAttending = !!(player && game.game_attendees?.some(
                            (attendee) => attendee.player_id === player.id && attendee.payment_status === 'completed'
                          ))
                          
                          // Check if user has purchased the season (for season games)
                          const hasPurchasedSeason = game.season_id && player && game.season_attendees?.some(
                            (attendee) => attendee.player_id === player.id && attendee.payment_status === 'completed'
                          ) || false

                          // For season games, if they purchased the season, they're considered attending by default
                          const isUserAttendingSeason = isUserAttending || hasPurchasedSeason

                          return (
                            <HomepageGameCard
                              key={game.id}
                              gameName={game.name}
                              time={game.game_time}
                              price={game.price}
                              location={game.location}
                              maxAttendees={game.total_tickets}
                              groupName={game.groups.name}
                              gameId={game.id}
                              tags={['Intermediate', 'Outdoors']}
                              seasonId={game.season_id || game.seasons?.id}
                              seasonSignupDeadline={game.season_signup_deadline || game.seasons?.season_signup_deadline}
                              isUserAttending={isUserAttendingSeason}
                              hasPurchasedSeason={hasPurchasedSeason}
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
