'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { ArrowLeft, Instagram, Globe, MessageCircle, Component, Edit } from 'lucide-react'
import { HomepageGameCard } from '@/components/homepage-game-card'
import { SeasonCard } from '@/components/season-card'
import { useAuth } from '@/contexts/auth-context'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { GroupEditForm } from '@/components/groups/group-edit-form'
import { GlassyButton } from '@/components/ui/glassy-button'
import { AnimatedAvatar } from '@/components/ui/animated-avatar'
import { fetchGroupDetailData } from '@/lib/optimized-queries'

// Animated counter component
function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => {
    // Handle decimal values
    if (value % 1 !== 0) {
      return latest.toFixed(1)
    }
    return Math.round(latest).toString()
  })

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: "easeOut"
    })
    return controls.stop
  }, [count, value])

  return <motion.span>{rounded}</motion.span>
}

interface Player {
  id: string
  name: string
  email: string
  photo_url?: string
}



interface Group {
  id: string
  name: string
  description: string
  tags: string[]
  instagram?: string
  website?: string
  whatsapp_group?: string
  created_by?: string
  created_at: string
  photo_url?: string
}

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
  seasons?: {
    id: string
    season_signup_deadline: string
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
  season_attendees?: {
    id: string
    player_id: string
    payment_status: string
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
    players?: {
      name: string
      photo_url?: string
    }
  }[]
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  const { player } = useAuth()
  
  const [group, setGroup] = useState<Group | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'games' | 'seasons'>('games')
  const [players, setPlayers] = useState<Player[]>([])
  const [hasUserJoined, setHasUserJoined] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  
  // Progressive loading states
  const [basicDataLoaded, setBasicDataLoaded] = useState(false)
  const [tabsDataLoaded, setTabsDataLoaded] = useState(false)

  // Load basic group data first (fast)
  const loadBasicData = useCallback(async () => {
    if (!supabase || basicDataLoaded) {
      setLoading(false)
      return
    }

    try {
      // Fetch only basic group data first
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) {
        throw new Error('Group not found')
      }

      setGroup(groupData)
      setBasicDataLoaded(true)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching basic group data:', err)
      setError('Failed to load group details')
      setLoading(false)
    }
  }, [groupId, basicDataLoaded])

  // Load tabs data in background (slower)
  const loadTabsData = useCallback(async () => {
    if (!supabase || !group || tabsDataLoaded) return

    try {
      // Use optimized query with caching for detailed data
      const { games, seasons, players } = await fetchGroupDetailData(groupId)
      
      setGames(games as unknown as Game[])
      setSeasons(seasons as unknown as Season[])
      setPlayers(players)

      // Check if user has joined any games or seasons in this group
      if (player) {
        const hasJoinedGame = games.some((game: {
          game_attendees?: Array<{
            player_id: string;
            payment_status: string;
          }>;
        }) => 
          game.game_attendees?.some((attendee: {
            player_id: string;
            payment_status: string;
          }) => 
            attendee.player_id === player.id && attendee.payment_status === 'completed'
          )
        )
        
        const hasJoinedSeason = seasons.some((season: {
          season_attendees?: Array<{
            player_id: string;
            payment_status: string;
          }>;
        }) => 
          season.season_attendees?.some((attendee: {
            player_id: string;
            payment_status: string;
          }) => 
            attendee.player_id === player.id && attendee.payment_status === 'completed'
          )
        )
        
        setHasUserJoined(hasJoinedGame || hasJoinedSeason)
      }
      
      setTabsDataLoaded(true)
    } catch (err) {
      console.error('Error fetching tabs data:', err)
    }
  }, [groupId, group, player, tabsDataLoaded])

  useEffect(() => {
    if (groupId) {
      // Load basic data first (instant)
      loadBasicData()
      
      // Then load tabs data in background
      setTimeout(() => {
        loadTabsData()
      }, 100) // Small delay to ensure basic data loads first
    }
  }, [groupId, loadBasicData, loadTabsData])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    })
  }

  if (showEditForm) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <GroupEditForm
            groupId={groupId}
            onSuccess={async () => {
              // Wait a bit for DB to update
              await new Promise(resolve => setTimeout(resolve, 200))
              // Reset states and reload data
              setBasicDataLoaded(false)
              setTabsDataLoaded(false)
              setLoading(true)
              await loadBasicData()
              setTimeout(() => {
                loadTabsData()
              }, 100)
              setShowEditForm(false)
            }}
            onCancel={() => setShowEditForm(false)}
          />
        </div>
      </div>
    )
  }

  if (loading || !basicDataLoaded) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading group details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center py-12">
            <Component className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Group Not Found
            </h3>
            <p className="text-gray-600 mb-6">
              The group you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button
              onClick={() => window.location.href = '/groups'}
            >
              Back to Groups
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        {/* Back Button and Edit Group */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/groups'}
            className="text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back to Groups</span>
            <span className="sm:hidden">Back</span>
          </Button>
          
          {player && group && player.id === group.created_by && (
            <Button
              onClick={() => setShowEditForm(true)}
              variant="outline"
              size="icon"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Group Header - Centered Layout */}
        <div className="text-center mb-8 md:mb-12">
          {/* Group Icon/Photo */}
          <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 overflow-hidden">
            {group.photo_url ? (
              <Image
                src={group.photo_url}
                alt={group.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <Component className="w-12 h-12 text-gray-600" />
            )}
          </div>

          {/* Group Name */}
          <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">{group.name}</h1>
          
          {/* Created Date */}
          <p className="text-xs md:text-sm text-gray-600 mb-4">Created {formatDate(group.created_at)}</p>

          {/* Social Links */}
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-3">
              {group.whatsapp_group && hasUserJoined && (
                <GlassyButton
                  href={group.whatsapp_group}
                  tooltip="WhatsApp Group"
                >
                  <MessageCircle className="w-5 h-5" />
                </GlassyButton>
              )}
              {group.instagram && (
                <GlassyButton
                  href={group.instagram}
                  tooltip="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </GlassyButton>
              )}
              {group.website && (
                <GlassyButton
                  href={group.website}
                  tooltip="Website"
                >
                  <Globe className="w-5 h-5" />
                </GlassyButton>
              )}
            </div>
          </div>

          {/* Add Game/Season Button - Only for Admins */}
          {player && group && player.id === group.created_by && (
            <div className="mb-8">
              <Button
                onClick={() => router.push(`/create-game?groupId=${groupId}`)}
                className="bg-black hover:bg-gray-800 text-white text-sm md:text-base"
              >
                Add Game/Season
              </Button>
            </div>
          )}

          {/* Description */}
          <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-6 max-w-2xl mx-auto px-4">{group.description}</p>

          {/* Tags */}
          {group.tags && group.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap justify-center gap-2">
                {group.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Group Stats */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-8">
            <div className="bg-gray-100 text-black rounded-xl px-4 md:px-5 py-2 md:py-3 text-center min-w-[90px] md:min-w-[110px]">
              <div className="text-2xl md:text-3xl font-bold mb-1">
                <AnimatedCounter value={games.length} />
              </div>
              <div className="text-xs md:text-sm text-gray-700">Games</div>
            </div>
            <div className="bg-gray-100 text-black rounded-xl px-4 md:px-5 py-2 md:py-3 text-center min-w-[90px] md:min-w-[110px]">
              <div className="text-2xl md:text-3xl font-bold mb-1">
                <AnimatedCounter value={seasons.length} />
              </div>
              <div className="text-xs md:text-sm text-gray-700">Seasons</div>
            </div>
            <div className="bg-gray-100 text-black rounded-xl px-4 md:px-5 py-2 md:py-3 text-center min-w-[90px] md:min-w-[110px]">
              <div className="text-2xl md:text-3xl font-bold mb-1">
                <AnimatedCounter value={players.length} />
              </div>
              <div className="text-xs md:text-sm text-gray-700">Players</div>
            </div>
          </div>

          {/* Group Players */}
          <div className="mb-8">
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-4">
              Group Players ({players.length})
            </h3>
            {players.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {players.map((player) => (
                  <AnimatedAvatar
                    key={player.id}
                    src={player.photo_url}
                    alt={player.name}
                    fallback={player.name?.charAt(0).toUpperCase() || '?'}
                    name={player.name || 'Unknown Player'}
                    size="md"
                    hoverEffect="lift"
                    showTooltip={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  {games.length === 0 && seasons.length === 0 
                    ? "No games or seasons yet - players will appear here once games/seasons are created and people sign up"
                    : "No players have signed up for games or seasons yet"
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabbed Content Panel */}
        <div>
          {/* Tab Headers - Motion.dev Style */}
          <motion.div 
            className="px-2 md:px-6 pt-4 md:pt-6 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-sm md:w-auto">
              {['games', 'seasons'].map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'games' | 'seasons')}
                  className={`relative flex-1 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md text-center transition-colors ${
                    activeTab === tab
                      ? 'text-black bg-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {activeTab === tab && (
                    <motion.div
                      className="absolute inset-0 bg-white rounded-md shadow-sm"
                      layoutId="activeTab"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30
                      }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab === 'games' ? 'Games' : 'Seasons'}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
              <AnimatePresence mode="wait">
              {activeTab === 'games' && (
                <motion.div
                  key="games"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {!tabsDataLoaded ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading games...</p>
                    </div>
                  ) : games.length > 0 ? (
                  <div className="max-w-lg mx-auto space-y-6">
                  {games.map((game) => {
                    // Check if user has purchased the season (for season games)
                    const hasPurchasedSeason = game.season_id && player && game.season_game_attendance?.some(
                      (attendance) => attendance.season_attendees.player_id === player.id && attendance.season_attendees.payment_status === 'completed'
                    ) || false

                    // Check if current user is attending this game
                    const isUserAttending = !!(player && game.game_attendees?.some(
                      (attendee) => attendee.player_id === player.id && attendee.payment_status === 'completed'
                    ))

                    // For season games, if they purchased the season, they're considered attending by default
                    const isUserAttendingSeason = isUserAttending || hasPurchasedSeason

                    return (
                      <HomepageGameCard
                        key={game.id}
                        gameId={game.id}
                        gameName={game.name}
                        time={game.game_time}
                        location={game.location}
                        price={game.price}
                        maxAttendees={game.total_tickets}
                        gameAttendees={game.game_attendees || []}
                        seasonGameAttendance={game.season_game_attendance || []}
                        seasonId={game.season_id}
                        seasonSignupDeadline={game.season_signup_deadline}
                        groupName={group.name}
                        tags={[]}
                        isUserAttending={isUserAttendingSeason}
                        hasPurchasedSeason={hasPurchasedSeason}
                      />
                    )
                  })}
                  </div>
                ) : (
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
                      No games yet
                </h3>
                <p className="text-gray-600 mb-6">
                      This group hasn&apos;t created any games yet.
                </p>
                    {player && (
                <Button
                  onClick={() => router.push(`/create-game?groupId=${groupId}`)}
                >
                        Create Game
                </Button>
                    )}
              </div>
                )}
                </motion.div>
              )}

              {activeTab === 'seasons' && (
                <motion.div
                  key="seasons"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {!tabsDataLoaded ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading seasons...</p>
                    </div>
                  ) : seasons.length > 0 ? (
                  <div className="max-w-lg mx-auto space-y-6">
                  {seasons.map((season) => (
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
                      groupName={group.name}
                          location={season.location}
                      seasonSpotsAvailable={season.season_spots - (season.season_attendees?.filter(att => att.payment_status === 'completed').length || 0)}
                      gameSpotsAvailable={season.game_spots}
                      seasonAttendees={season.season_attendees}
                    />
                  ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <Image 
                        src="/calendar.png" 
                        alt="Calendar" 
                        width={64} 
                        height={64} 
                        className="w-16 h-16 mx-auto rounded-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No seasons yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      This group hasn&apos;t created any seasons yet.
                    </p>
                    {player && (
                      <Button
                        onClick={() => router.push(`/create-game?groupId=${groupId}`)}
                      >
                        Create First Season
                      </Button>
                    )}
                  </div>
                )}
                </motion.div>
              )}

            </AnimatePresence>
            </div>
        </div>
      </div>

    </div>
  )
}