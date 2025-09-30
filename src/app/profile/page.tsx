'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/profile/profile-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Header } from '@/components/header'
import { Calendar, Edit, Trophy, Users, Component, Instagram, Globe } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { HomepageGameCard } from '@/components/homepage-game-card'
import { SeasonCard } from '@/components/season-card'
import { AuthModal } from '@/components/auth/auth-modal'

interface GameAttendee {
  id: string
  player_id: string
  payment_status: string
  attendance_status?: 'attending' | 'not_attending'
}

interface GameHistory {
  id: string
  created_at: string
  amount_paid: number
  games: {
    name: string
    game_date: string
    game_time: string
    location: string
    duration_hours: number
    season_id?: string
    season_signup_deadline?: string
    total_tickets?: number
    game_attendees?: GameAttendee[]
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
    seasons?: {
      id: string
      season_signup_deadline: string
    }
    groups: {
      name: string
    }
  }
}

interface CreatedGame {
  id: string
  name: string
  game_date: string
  duration_hours: number
  groups: {
    name: string
  }
  created_at: string
}

interface CreatedGroup {
  id: string
  name: string
  description: string
  created_at: string
  created_by?: string
  tags?: string[]
  instagram?: string
  website?: string
  games?: Array<{
    id: string
    game_date: string
  }>
}

interface SeasonHistory {
  id: string
  created_at: string
  amount_paid: number
  seasons: {
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
  }
}

export default function ProfilePage() {
  const { user, player, loading: authLoading } = useAuth()
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [createdGames, setCreatedGames] = useState<CreatedGame[]>([])
  const [createdGroups, setCreatedGroups] = useState<CreatedGroup[]>([])
  const [memberGroups, setMemberGroups] = useState<CreatedGroup[]>([])
  const [upcomingGames, setUpcomingGames] = useState<GameHistory[]>([])
  const [upcomingSeasons, setUpcomingSeasons] = useState<SeasonHistory[]>([])
  const [pastSeasons, setPastSeasons] = useState<SeasonHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'attended' | 'groups' | 'upcoming'>('upcoming')
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const fetchGameHistory = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false)
      return
    }

    try {
      // Query games table directly for past games
      const { data: allGames, error } = await supabase
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
        .lt('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: false })

      if (error) {
        console.error('Error fetching game history:', error)
      } else {
        // Filter for games where user attended
        const pastGames = allGames?.filter((game) => {
          const userAttendee = game.game_attendees?.find(
            (attendee: GameAttendee) => 
              attendee.player_id === (player?.id || user.id) && 
              attendee.payment_status === 'completed'
          )
          
          // User must have paid AND be marked as attending (or have no attendance_status set, which defaults to attending)
          return userAttendee && (userAttendee.attendance_status === 'attending' || !userAttendee.attendance_status)
        }) || []
        
        // Transform to match the expected format
        const transformedGames = pastGames.map((game) => ({
          id: game.game_attendees?.find((a: GameAttendee) => a.player_id === (player?.id || user.id))?.id || '',
          created_at: game.game_attendees?.find((a: GameAttendee) => a.player_id === (player?.id || user.id))?.created_at || '',
          amount_paid: game.game_attendees?.find((a: GameAttendee) => a.player_id === (player?.id || user.id))?.amount_paid || 0,
          games: {
            name: game.name,
            game_date: game.game_date,
            game_time: game.game_time,
            location: game.location,
            duration_hours: game.duration_hours,
            season_id: game.season_id,
            season_signup_deadline: game.season_signup_deadline,
            total_tickets: game.total_tickets,
            game_attendees: game.game_attendees,
            seasons: game.seasons,
            groups: game.groups
          }
        }))
        
        setGameHistory(transformedGames as GameHistory[])
      }
    } catch (err) {
      console.error('Error fetching game history:', err)
    } finally {
      setLoading(false)
    }
  }, [user, player?.id])

  const fetchCreatedGames = useCallback(async () => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          name,
          game_date,
          duration_hours,
          created_at,
          groups (
            name
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching created games:', error)
      } else {
        setCreatedGames((data as unknown as CreatedGame[]) || [])
      }
    } catch (err) {
      console.error('Error fetching created games:', err)
    }
  }, [user])

  const fetchCreatedGroups = useCallback(async () => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          created_at,
          created_by,
          tags,
          instagram,
          website,
          games!inner (
            id,
            game_date
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching created groups:', error)
      } else {
        setCreatedGroups((data as unknown as CreatedGroup[]) || [])
      }
    } catch (err) {
      console.error('Error fetching created groups:', err)
    }
  }, [user])

  const fetchMemberGroups = useCallback(async () => {
    if (!supabase || !user) return

    try {
      // Get groups where the user has attended games
      const { data, error } = await supabase
        .from('game_attendees')
        .select(`
          games!inner (
            group_id,
            groups!inner (
              id,
              name,
              description,
              created_at,
              created_by,
              tags,
              instagram,
              website,
              games!inner (
                id,
                game_date
              )
            )
          )
        `)
        .eq('player_id', user.id)
        .eq('payment_status', 'completed')

      if (error) {
        console.error('Error fetching member groups:', error)
      } else {
        // Extract unique groups from the data
        const groupsMap = new Map()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.forEach((item: any) => {
          const group = item.games.groups
          if (!groupsMap.has(group.id)) {
            groupsMap.set(group.id, group)
          }
        })
        setMemberGroups(Array.from(groupsMap.values()))
      }
    } catch (err) {
      console.error('Error fetching member groups:', err)
    }
  }, [user])

  const fetchUpcomingGames = useCallback(async () => {
    if (!supabase || !user) return

    try {
      // Query games table directly (like homepage does)
      const { data: allGames, error } = await supabase
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

      if (error) {
        console.error('Error fetching upcoming games:', error)
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

        // Filter for games where user is attending (including season attendees)
        const upcomingGames = gamesWithSeasonAttendees?.filter((game) => {
          const userAttendee = game.game_attendees?.find(
            (attendee: GameAttendee) => 
              attendee.player_id === (player?.id || user.id) && 
              attendee.payment_status === 'completed'
          )
          
          // User must have paid AND be marked as attending (or have no attendance_status set, which defaults to attending)
          return userAttendee && (userAttendee.attendance_status === 'attending' || !userAttendee.attendance_status)
        }) || []
        
        // Transform to match the expected format
        const transformedGames = upcomingGames.map((game) => ({
          id: game.game_attendees?.find((a: GameAttendee) => a.player_id === (player?.id || user.id))?.id || '',
          created_at: game.game_attendees?.find((a: GameAttendee) => a.player_id === (player?.id || user.id))?.created_at || '',
          amount_paid: game.game_attendees?.find((a: GameAttendee) => a.player_id === (player?.id || user.id))?.amount_paid || 0,
          games: {
            name: game.name,
            game_date: game.game_date,
            game_time: game.game_time,
            location: game.location,
            duration_hours: game.duration_hours,
            season_id: game.season_id,
            season_signup_deadline: game.season_signup_deadline,
            total_tickets: game.total_tickets,
            game_attendees: game.game_attendees,
            seasons: game.seasons,
            groups: game.groups
          }
        }))
        
        setUpcomingGames(transformedGames as GameHistory[])
      }
    } catch (err) {
      console.error('Error fetching upcoming games:', err)
    }
  }, [user, player?.id])

  const fetchUpcomingSeasons = useCallback(async () => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .from('season_attendees')
        .select(`
          id,
          created_at,
          amount_paid,
          seasons!inner (
            id,
            name,
            description,
            season_price,
            individual_game_price,
            total_games,
            season_spots,
            game_spots,
            first_game_date,
            first_game_time,
            repeat_type,
            location,
            groups (
              name,
              whatsapp_group
            )
          )
        `)
        .eq('player_id', player?.id || user.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching upcoming seasons:', error)
      } else {
        // Filter upcoming seasons on the client side
        const today = new Date().toISOString().split('T')[0]
        const upcomingSeasons = (data as unknown as SeasonHistory[])?.filter(
          (item) => item.seasons.first_game_date >= today
        ) || []
        
        setUpcomingSeasons(upcomingSeasons)
      }
    } catch (err) {
      console.error('Error fetching upcoming seasons:', err)
    }
  }, [user, player?.id])

  const fetchPastSeasons = useCallback(async () => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .from('season_attendees')
        .select(`
          id,
          created_at,
          amount_paid,
          seasons!inner (
            id,
            name,
            description,
            season_price,
            individual_game_price,
            total_games,
            season_spots,
            game_spots,
            first_game_date,
            first_game_time,
            repeat_type,
            location,
            groups (
              name,
              whatsapp_group
            )
          )
        `)
        .eq('player_id', player?.id || user.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching past seasons:', error)
      } else {
        // Filter past seasons on the client side
        const today = new Date().toISOString().split('T')[0]
        const pastSeasons = (data as unknown as SeasonHistory[])?.filter(
          (item) => item.seasons.first_game_date < today
        ) || []
        
        setPastSeasons(pastSeasons)
      }
    } catch (err) {
      console.error('Error fetching past seasons:', err)
    }
  }, [user, player?.id])

  useEffect(() => {
    if (user && player) {
      fetchGameHistory()
      fetchCreatedGames()
      fetchCreatedGroups()
      fetchMemberGroups()
      fetchUpcomingGames()
      fetchUpcomingSeasons()
      fetchPastSeasons()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, player, authLoading, fetchGameHistory, fetchCreatedGames, fetchCreatedGroups, fetchMemberGroups, fetchUpcomingGames, fetchUpcomingSeasons, fetchPastSeasons])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // GroupCard component for profile page
  const GroupCard = ({ group }: { group: CreatedGroup }) => {
    return (
      <Link href={`/groups/${group.id}`} className="block">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
          {/* Group Header */}
          <div className="h-32 bg-gray-50 flex items-center justify-center">
            <Component className="w-8 h-8 text-gray-400" />
          </div>

          <div className="p-6">
            {/* Group Name */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
            
            {/* Tags */}
            {group.tags && group.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {group.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Upcoming Games Count */}
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{group.games?.length || 0} upcoming games</span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4 mb-4">
              {group.instagram && (
                <a
                  href={`https://instagram.com/${group.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-600 hover:text-pink-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Instagram className="w-4 h-4 mr-1" />
                  <span className="text-sm">{group.instagram}</span>
                </a>
              )}
              {group.website && (
                <a
                  href={group.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Globe className="w-4 h-4 mr-1" />
                  <span className="text-sm">Website</span>
                </a>
              )}
            </div>

            {/* Created Date */}
            <div className="flex items-center text-gray-500 text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Created {formatDate(group.created_at)}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }


  const calculateTotalHoursPlayed = () => {
    return gameHistory.reduce((total, history) => {
      return total + (history.games.duration_hours || 0)
    }, 0)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-white">
          <Header />
          <div className="container mx-auto px-4 py-16">
            <div className="text-center py-12">
              <div className="mb-4">
                <Image
                  src="/0_2.jpeg"
                  alt="User"
                  width={96}
                  height={96}
                  className="w-24 h-24 mx-auto rounded-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Sign In Required
              </h3>
              <p className="text-gray-600 mb-6">
                Please sign in to view your profile.
              </p>
              <Button
                onClick={() => setAuthModalOpen(true)}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
        
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode="signin"
        />
      </>
    )
  }

  if (showEditForm) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <ProfileForm
            isEditing={true}
            onSuccess={() => setShowEditForm(false)}
            onCancel={() => setShowEditForm(false)}
          />
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-600">
              Set up your profile to connect with other players and track your game history.
            </p>
          </div>
          <ProfileForm
            onSuccess={() => window.location.reload()}
          />
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Profile Header - Luma Style */}
        <div className="text-center mb-12">
          {/* Profile Photo */}
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            {player.photo_url ? (
              <Image
                src={player.photo_url}
                alt={player.name}
                width={128}
                height={128}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <span className="text-4xl text-gray-600 font-bold">
                {player.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">{player.name}</h1>
          
          {/* Joined Date */}
          <p className="text-gray-600 mb-8">Joined {formatDate(player.member_since)}</p>

          {/* Simple Stats - Luma Style */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{createdGroups.length + createdGames.length}</div>
              <div className="text-sm text-gray-600">Hosted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{gameHistory.length}</div>
              <div className="text-sm text-gray-600">Attended</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{calculateTotalHoursPlayed().toFixed(1)}</div>
              <div className="text-sm text-gray-600">Hours Played</div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <Button
            onClick={() => setShowEditForm(true)}
            variant="outline"
            className="mb-8"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Tabbed Content Panel */}
        <div>
          {/* Tab Headers - Motion.dev Style */}
          <motion.div 
            className="px-6 pt-6 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {['upcoming', 'attended', 'groups'].map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'upcoming' | 'attended' | 'groups')}
                  className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md text-center transition-colors ${
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
                    {tab === 'upcoming' ? 'Upcoming' : tab === 'attended' ? 'Past' : 'Groups'}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'attended' && (
                <motion.div
                  key="attended"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {gameHistory.length === 0 && pastSeasons.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No games or seasons attended yet.</p>
                    </div>
                  ) : (
                    <div className="max-w-lg mx-auto space-y-6">
                      {/* Past Seasons Section */}
                      {pastSeasons.length > 0 && (
                        <div>
                          <div className="text-center mb-4">
                            <h3 className="text-sm text-gray-600">
                              Completed Seasons
                            </h3>
                          </div>
                          <div className="space-y-4">
                            {pastSeasons.map((season) => (
                              <SeasonCard
                                key={season.id}
                                seasonId={season.seasons.id}
                                seasonName={season.seasons.name}
                                description={season.seasons.description}
                                seasonPrice={season.seasons.season_price}
                                individualGamePrice={season.seasons.individual_game_price}
                                totalGames={season.seasons.total_games}
                                seasonSpots={season.seasons.season_spots}
                                gameSpots={season.seasons.game_spots}
                                firstGameDate={season.seasons.first_game_date}
                                firstGameTime={season.seasons.first_game_time}
                                repeatType={season.seasons.repeat_type}
                                groupName={season.seasons.groups.name}
                                location={season.seasons.location}
                                seasonSpotsAvailable={season.seasons.season_spots - 1} // User attended
                                gameSpotsAvailable={season.seasons.game_spots}
                                isUserAttending={true}
                                isPastSeason={true}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Past Individual Games Section */}
                      {gameHistory.length > 0 && (
                        <div>
                          <div className="text-center mb-4">
                            <h3 className="text-sm text-gray-600">
                              Individual Games
                            </h3>
                          </div>
                          {(() => {
                            // Group games by date
                            const gamesByDate = gameHistory.reduce((acc, game) => {
                              const date = new Date(game.games.game_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                              })
                              if (!acc[date]) {
                                acc[date] = []
                              }
                              acc[date].push(game)
                              return acc
                            }, {} as Record<string, typeof gameHistory>)

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
                                  {dateGames.map((game) => (
                                    <HomepageGameCard
                                      key={game.id}
                                      gameName={game.games.name}
                                      time={game.games.game_time}
                                      price={game.amount_paid}
                                      location={game.games.location}
                                      maxAttendees={game.games.total_tickets || 10}
                                      groupName={game.games.groups.name}
                                      gameId={game.id}
                                      tags={[]}
                                      seasonId={game.games.season_id || game.games.seasons?.id}
                                      seasonSignupDeadline={game.games.season_signup_deadline || game.games.seasons?.season_signup_deadline}
                                      isUserAttending={true}
                                      hasPurchasedSeason={game.games.season_id && game.games.season_attendees?.some(
                                        (attendee) => attendee.player_id === (player?.id || user.id) && attendee.payment_status === 'completed'
                                      ) || false}
                                      gameAttendees={game.games.game_attendees || []}
                                      seasonGameAttendance={game.games.season_game_attendance || []}
                                      isPastGame={true}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'groups' && (
                <motion.div
                  key="groups"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                {memberGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No groups joined yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {memberGroups.map((group) => (
                      <GroupCard key={group.id} group={group} />
                    ))}
                  </div>
                )}
                </motion.div>
              )}

              {activeTab === 'upcoming' && (
                <motion.div
                  key="upcoming"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  
                  {upcomingGames.length === 0 && upcomingSeasons.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No upcoming games or seasons registered.</p>
                    </div>
                  ) : (
                    <div className="max-w-lg mx-auto space-y-6">
                      {/* Seasons Section */}
                      {upcomingSeasons.length > 0 && (
                        <div>
                          <div className="text-center mb-4">
                            <h3 className="text-sm text-gray-600">
                              Seasons
                            </h3>
                          </div>
                          <div className="space-y-4">
                            {upcomingSeasons.map((season) => (
                              <SeasonCard
                                key={season.id}
                                seasonId={season.seasons.id}
                                seasonName={season.seasons.name}
                                description={season.seasons.description}
                                seasonPrice={season.seasons.season_price}
                                individualGamePrice={season.seasons.individual_game_price}
                                totalGames={season.seasons.total_games}
                                seasonSpots={season.seasons.season_spots}
                                gameSpots={season.seasons.game_spots}
                                firstGameDate={season.seasons.first_game_date}
                                firstGameTime={season.seasons.first_game_time}
                                repeatType={season.seasons.repeat_type}
                                groupName={season.seasons.groups.name}
                                location={season.seasons.location}
                                seasonSpotsAvailable={season.seasons.season_spots - 1} // User is attending
                                gameSpotsAvailable={season.seasons.game_spots}
                                isUserAttending={true}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Individual Games Section */}
                      {upcomingGames.length > 0 && (
                        <div>
                          <div className="text-center mb-4">
                            <h3 className="text-sm text-gray-600">
                              Individual Games
                            </h3>
                          </div>
                          {(() => {
                            // Group games by date
                            const gamesByDate = upcomingGames.reduce((acc, game) => {
                              const date = new Date(game.games.game_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                              })
                              if (!acc[date]) {
                                acc[date] = []
                              }
                              acc[date].push(game)
                              return acc
                            }, {} as Record<string, typeof upcomingGames>)

                            return Object.entries(gamesByDate).map(([date, dateGames], index) => (
                              <div key={date} className={index > 0 ? "mt-8" : ""}>
                                {/* Date Label */}
                                <div className="text-center mb-6">
                                  <h3 className="text-sm text-gray-600">
                                    {date}
                                  </h3>
                                </div>
                                
                                {/* Games for this date */}
                                <div className="space-y-4">
                                  {dateGames.map((game) => (
                                    <HomepageGameCard
                                      key={game.id}
                                      gameName={game.games.name}
                                      time={game.games.game_time}
                                      price={game.amount_paid}
                                      location={game.games.location}
                                      maxAttendees={game.games.total_tickets || 10}
                                      groupName={game.games.groups.name}
                                      gameId={game.id}
                                      tags={[]}
                                      seasonId={game.games.season_id || game.games.seasons?.id}
                                      seasonSignupDeadline={game.games.season_signup_deadline || game.games.seasons?.season_signup_deadline}
                                      isUserAttending={true}
                                      hasPurchasedSeason={game.games.season_id && game.games.season_attendees?.some(
                                        (attendee) => attendee.player_id === (player?.id || user.id) && attendee.payment_status === 'completed'
                                      ) || false}
                                      gameAttendees={game.games.game_attendees || []}
                                      seasonGameAttendance={game.games.season_game_attendance || []}
                                      isPastGame={false}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
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
    
    <AuthModal
      isOpen={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      initialMode="signin"
    />
    </>
  )
}

