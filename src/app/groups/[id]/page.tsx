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
  }[]
  season_attendees?: {
    id: string
    player_id: string
    payment_status: string
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

  const fetchGroupDetails = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) {
        console.error('Error fetching group:', groupError)
        setError('Failed to load group details')
        return
      }

      setGroup(groupData)

      // Fetch games for this group
      const { data: gamesData, error: gamesError } = await supabase
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
          )
        `)
        .eq('group_id', groupId)
        .order('game_date', { ascending: true })

      if (gamesError) {
        console.error('Error fetching games:', gamesError)
      } else {
        // For each game, if it's part of a season, fetch season attendees
        const gamesWithSeasonAttendees = await Promise.all(
          (gamesData || []).map(async (game) => {
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
                      player_id: attendee.player_id,
                      payment_status: 'completed',
                      attendance_status: gameAttendance?.attendance_status || 'attending'
                    }
                  })

                  // Combine individual game attendees with season attendees
                  const allAttendees = [
                    ...(game.game_attendees || []),
                    ...seasonAttendeesWithStatus
                  ]

                  // Remove duplicates based on player_id
                  const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
                    index === self.findIndex(a => a.player_id === attendee.player_id)
                  )

                  return {
                    ...game,
                    game_attendees: uniqueAttendees,
                    season_attendees: seasonAttendees
                  }
                }
              } catch (err) {
                console.error('Error fetching season attendees for game:', game.id, err)
              }
            }
            return game
          })
        )
        setGames(gamesWithSeasonAttendees)
      }

      // Fetch seasons for this group
      const { data: seasonsData, error: seasonsError } = await supabase
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
        .eq('group_id', groupId)
        .order('first_game_date', { ascending: true })

      if (seasonsError) {
        console.error('Error fetching seasons:', seasonsError)
      } else {
        setSeasons(seasonsData || [])
      }

      // Check if user has joined any games or seasons in this group
      if (player) {
        const hasJoinedGame = (gamesData || []).some((game: { game_attendees?: { player_id: string; payment_status: string }[] }) => 
          game.game_attendees?.some((attendee: { player_id: string; payment_status: string }) => 
            attendee.player_id === player.id && attendee.payment_status === 'completed'
          )
        )
        
        const hasJoinedSeason = (seasonsData || []).some((season: { season_attendees?: { player_id: string; payment_status: string }[] }) => 
          season.season_attendees?.some((attendee: { player_id: string; payment_status: string }) => 
            attendee.player_id === player.id && attendee.payment_status === 'completed'
          )
        )
        
        setHasUserJoined(hasJoinedGame || hasJoinedSeason)
      }

      // Fetch players from both individual game attendees and season attendees
      const allPlayers = new Map<string, Player>()

      // Fetch individual game attendees (only if there are games)
      let gameAttendeesData = null
      let gameAttendeesError = null
      
      if (gamesData && gamesData.length > 0) {
        const result = await supabase
          .from('game_attendees')
          .select(`
            player_id,
            players!inner (
              id,
              name,
              email,
              photo_url
            )
          `)
          .eq('payment_status', 'completed')
          .in('game_id', gamesData.map(game => game.id))
        
        gameAttendeesData = result.data
        gameAttendeesError = result.error
      }

      if (!gameAttendeesError && gameAttendeesData) {
        (gameAttendeesData as unknown as { player_id: string; players: { id: string; name: string; email: string; photo_url?: string } }[]).forEach((attendee) => {
          if (attendee.players && attendee.players.id) {
            const player = attendee.players
            if (player && player.id) {
              allPlayers.set(player.id, {
                id: player.id,
                name: player.name,
                email: '', // Hide email
                photo_url: player.photo_url
              })
            }
          }
        })
      }

      // Fetch season attendees (only if there are seasons)
      let seasonAttendeesData = null
      let seasonAttendeesError = null
      
      if (seasonsData && seasonsData.length > 0) {
        const result = await supabase
          .from('season_attendees')
          .select(`
            player_id,
            players!inner (
              id,
              name,
              email,
              photo_url
            )
          `)
          .eq('payment_status', 'completed')
          .in('season_id', seasonsData.map(season => season.id))
        
        seasonAttendeesData = result.data
        seasonAttendeesError = result.error
      }

      if (!seasonAttendeesError && seasonAttendeesData) {
        (seasonAttendeesData as unknown as { player_id: string; players: { id: string; name: string; email: string; photo_url?: string } }[]).forEach((attendee) => {
          if (attendee.players && attendee.players.id) {
            const player = attendee.players
            if (player && player.id) {
              allPlayers.set(player.id, {
                id: player.id,
                name: player.name,
                email: '', // Hide email
                photo_url: player.photo_url
              })
            }
          }
        })
      }

      const playersArray = Array.from(allPlayers.values())
      setPlayers(playersArray)
    } catch (err) {
      console.error('Error fetching group details:', err)
      setError('Failed to load group details')
    } finally {
      setLoading(false)
    }
  }, [groupId, player])

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails()
    }
  }, [groupId, fetchGroupDetails])

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
              await fetchGroupDetails()
              setShowEditForm(false)
            }}
            onCancel={() => setShowEditForm(false)}
          />
        </div>
      </div>
    )
  }

  if (loading) {
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
                <div className="relative group/social">
                  <a
                    href={group.whatsapp_group}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover/social:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    WhatsApp Group
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                  </div>
                </div>
              )}
              {group.instagram && (
                <div className="relative group/social">
                  <a
                    href={group.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover/social:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Instagram
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                  </div>
                </div>
              )}
              {group.website && (
                <div className="relative group/social">
                  <a
                    href={group.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover/social:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Website
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                  </div>
                </div>
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
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
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
                  <div 
                    key={player.id} 
                    className="relative group"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer">
                      {player.photo_url ? (
                        <Image
                          src={player.photo_url}
                          alt={player.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-gray-600">
                          {player.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {player.name || 'Unknown Player'}
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
                    </div>
                  </div>
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
                {games.length > 0 ? (
                  <div className="max-w-lg mx-auto space-y-6">
                  {games.map((game) => {
                    // Check if user has purchased the season (for season games)
                    const hasPurchasedSeason = game.season_id && player && game.season_attendees?.some(
                      (attendee) => attendee.player_id === player.id && attendee.payment_status === 'completed'
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
                {seasons.length > 0 ? (
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