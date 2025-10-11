'use client'

import { useState, useEffect, useCallback } from 'react'
// import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/profile/profile-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Header } from '@/components/header'
import { Calendar, Edit, Trophy, Users } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { HomepageGameCard } from '@/components/homepage-game-card'
import { SeasonCard } from '@/components/season-card'
import { AuthModal } from '@/components/auth/auth-modal'
import { GroupCard } from '@/components/group-card'
import { fetchSeasonsWithAttendance, isUserAttendingSeason, getSeasonPlayerCount } from '@/lib/attendance-service'
import type { SeasonWithAttendance } from '@/lib/attendance-service'

// Animated counter component
function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => {
    // Handle decimal values (like hours played)
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
    id: string
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
        players?: {
          name: string
          photo_url?: string
        }
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
  photo_url?: string
  games?: Array<{
    id: string
    game_date: string
    game_attendees?: Array<{
      player_id: string
    }>
  }>
  seasons?: Array<{
    id: string
    season_attendees?: Array<{
      player_id: string
    }>
  }>
}

// interface SeasonHistory {
//   id: string
//   created_at: string
//   amount_paid: number
//   seasons: {
//     id: string
//     name: string
//     description?: string
//     season_price: number
//     individual_game_price: number
//     total_games: number
//     season_spots: number
//     game_spots: number
//     first_game_date: string
//     first_game_time: string
//     repeat_type: string
//     location: string
//     groups: {
//       name: string
//       whatsapp_group?: string
//     }
//     season_attendees?: {
//       id: string
//       player_id: string
//       payment_status: string
//       players?: {
//         name: string
//         photo_url?: string
//       }
//     }[]
//   }
// }

export default function ProfilePage() {
  const { user, player, loading: authLoading } = useAuth()
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [createdGames, setCreatedGames] = useState<CreatedGame[]>([])
  const [createdGroups, setCreatedGroups] = useState<CreatedGroup[]>([])
  const [memberGroups, setMemberGroups] = useState<CreatedGroup[]>([])
  const [upcomingGames, setUpcomingGames] = useState<GameHistory[]>([])
  const [upcomingSeasons, setUpcomingSeasons] = useState<SeasonWithAttendance[]>([])
  const [pastSeasons, setPastSeasons] = useState<SeasonWithAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'attended' | 'groups' | 'upcoming'>('upcoming')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  
  // Progressive loading states
  const [basicDataLoaded, setBasicDataLoaded] = useState(false)
  const [tabsDataLoaded, setTabsDataLoaded] = useState(false)
  

  // Load basic profile data first (fast)
  const loadBasicData = useCallback(async () => {
    if (!user || !player || basicDataLoaded) return
    
    try {
      // Basic profile data is already available from auth context
      // Just set the basic data as loaded
      setBasicDataLoaded(true)
      setLoading(false)
    } catch (error) {
      console.error('Error loading basic data:', error)
      setLoading(false)
    }
  }, [user, player, basicDataLoaded])


  const fetchGameHistory = useCallback(async () => {
    if (!supabase || !user) {
      return
    }

    try {
      // Simplified query to avoid timeouts
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
          )
        `)
        .lt('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: false })

      if (error) {
        console.error('Error fetching game history:', error)
      } else {
        // Process games with player data
        const gamesWithPlayerData = await Promise.all(
          (allGames || []).map(async (game) => {
            // First, fetch player data for individual game attendees
            let gameAttendeesWithPlayers = game.game_attendees || []
            if (game.game_attendees && game.game_attendees.length > 0) {
              try {
                const { data: gameAttendeesData, error: gameAttendeesError } = await supabase
                  .from('game_attendees')
                  .select(`
                    id,
                    player_id,
                    payment_status,
                    attendance_status,
                    players (
                      name,
                      photo_url
                    )
                  `)
                  .eq('game_id', game.id)
                  .eq('payment_status', 'completed')

                if (!gameAttendeesError && gameAttendeesData) {
                  gameAttendeesWithPlayers = gameAttendeesData.map(attendee => ({
                    id: attendee.id,
                    player_id: attendee.player_id,
                    payment_status: attendee.payment_status,
                    attendance_status: attendee.attendance_status,
                    players: attendee.players || { name: 'Unknown Player' }
                  }))
                }
              } catch (err) {
                console.error('Error fetching game attendees for game:', game.id, err)
              }
            }

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
                      attendance_status: gameAttendance?.attendance_status || 'attending',
                      players: attendee.players || { name: 'Unknown Player' }
                    }
                  })

                  // Combine individual game attendees with season attendees
                  const allAttendees = [
                    ...gameAttendeesWithPlayers,
                    ...seasonAttendeesWithStatus
                  ]

                  // Remove duplicates based on player_id
                  const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
                    index === self.findIndex(a => a.player_id === attendee.player_id)
                  )

                  // Create season_game_attendance structure with player data
                  const seasonGameAttendanceWithPlayers = seasonAttendeesWithStatus.map(attendee => ({
                    attendance_status: attendee.attendance_status,
                    season_attendees: {
                      id: attendee.id,
                      player_id: attendee.player_id,
                      payment_status: attendee.payment_status,
                      players: attendee.players
                    }
                  }))

                  return {
                    ...game,
                    game_attendees: uniqueAttendees,
                    season_attendees: seasonAttendees,
                    season_game_attendance: seasonGameAttendanceWithPlayers
                  }
                }
              } catch (err) {
                console.error('Error fetching season attendees for game:', game.id, err)
              }
            }
            
            // For non-season games, return with processed individual attendees
            return {
              ...game,
              game_attendees: gameAttendeesWithPlayers
            }
          })
        )

        // Filter for games where user attended
        const pastGames = gamesWithPlayerData?.filter((game) => {
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
            id: game.id,
            name: game.name,
            game_date: game.game_date,
            game_time: game.game_time,
            location: game.location,
            duration_hours: game.duration_hours,
            season_id: game.season_id,
            season_signup_deadline: game.season_signup_deadline,
            total_tickets: game.total_tickets,
            game_attendees: game.game_attendees,
            season_game_attendance: game.season_game_attendance,
            seasons: game.seasons,
            groups: game.groups
          }
        }))
        
        setGameHistory(transformedGames as GameHistory[])
      }
    } catch (err) {
      console.error('Error fetching game history:', err)
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
              photo_url,
              games!inner (
                id,
                game_date,
                game_attendees (
                  player_id
                )
              ),
              seasons!inner (
                id,
                season_attendees (
                  player_id
                )
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
      // Simplified query to avoid timeouts
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
          )
        `)
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })

      if (error) {
        console.error('Error fetching upcoming games:', error)
      } else {
        // For each game, fetch player data for attendees
        const gamesWithPlayerData = await Promise.all(
          (allGames || []).map(async (game) => {
            // First, fetch player data for individual game attendees
            let gameAttendeesWithPlayers = game.game_attendees || []
            if (game.game_attendees && game.game_attendees.length > 0) {
              try {
                const { data: gameAttendeesData, error: gameAttendeesError } = await supabase
                  .from('game_attendees')
                  .select(`
                    id,
                    player_id,
                    payment_status,
                    attendance_status,
                    players (
                      name,
                      photo_url
                    )
                  `)
                  .eq('game_id', game.id)
                  .eq('payment_status', 'completed')

                if (!gameAttendeesError && gameAttendeesData) {
                  gameAttendeesWithPlayers = gameAttendeesData.map(attendee => ({
                    id: attendee.id,
                    player_id: attendee.player_id,
                    payment_status: attendee.payment_status,
                    attendance_status: attendee.attendance_status,
                    players: attendee.players || { name: 'Unknown Player' }
                  }))
                }
              } catch (err) {
                console.error('Error fetching game attendees for game:', game.id, err)
              }
            }

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
                      attendance_status: gameAttendance?.attendance_status || 'attending',
                      players: attendee.players || { name: 'Unknown Player' }
                    }
                  })

                  // Combine individual game attendees with season attendees
                  const allAttendees = [
                    ...gameAttendeesWithPlayers,
                    ...seasonAttendeesWithStatus
                  ]

                  // Remove duplicates based on player_id
                  const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
                    index === self.findIndex(a => a.player_id === attendee.player_id)
                  )

                  // Create season_game_attendance structure with player data
                  const seasonGameAttendanceWithPlayers = seasonAttendeesWithStatus.map(attendee => ({
                    attendance_status: attendee.attendance_status,
                    season_attendees: {
                      id: attendee.id,
                      player_id: attendee.player_id,
                      payment_status: attendee.payment_status,
                      players: attendee.players
                    }
                  }))

                  return {
                    ...game,
                    game_attendees: uniqueAttendees,
                    season_attendees: seasonAttendees,
                    season_game_attendance: seasonGameAttendanceWithPlayers
                  }
                }
              } catch (err) {
                console.error('Error fetching season attendees for game:', game.id, err)
              }
            }
            
            // For non-season games, return with processed individual attendees
            return {
              ...game,
              game_attendees: gameAttendeesWithPlayers
            }
          })
        )

        // Filter for games where user is attending (including season attendees)
        const upcomingGames = gamesWithPlayerData?.filter((game) => {
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
            id: game.id,
            name: game.name,
            game_date: game.game_date,
            game_time: game.game_time,
            location: game.location,
            duration_hours: game.duration_hours,
            season_id: game.season_id,
            season_signup_deadline: game.season_signup_deadline,
            total_tickets: game.total_tickets,
            game_attendees: game.game_attendees,
            season_game_attendance: game.season_game_attendance,
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
      await supabase
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

      // Use the centralized attendance service
      const seasons = await fetchSeasonsWithAttendance({
        dateFrom: new Date().toISOString().split('T')[0]
      })

      // Filter to only seasons where the user is attending
      const userSeasons = seasons.filter(season => 
        season.season_attendees?.some(attendee => 
          attendee.player_id === (player?.id || user.id) && 
          attendee.payment_status === 'completed'
        )
      )

      setUpcomingSeasons(userSeasons)
    } catch (err) {
      console.error('Error fetching upcoming seasons:', err)
    }
  }, [user, player?.id])

  const fetchPastSeasons = useCallback(async () => {
    if (!supabase || !user) return

    try {
      // Simplified query to avoid timeouts
      await supabase
        .from('season_attendees')
        .select(`
          id,
          created_at,
          amount_paid,
          seasons (
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

      // Use the centralized attendance service
      const seasons = await fetchSeasonsWithAttendance()

      // Filter to past seasons where the user is attending
      const today = new Date().toISOString().split('T')[0]
      const userPastSeasons = seasons.filter(season => 
        season.first_game_date < today &&
        season.season_attendees?.some(attendee => 
          attendee.player_id === (player?.id || user.id) && 
          attendee.payment_status === 'completed'
        )
      )

      setPastSeasons(userPastSeasons)
    } catch (err) {
      console.error('Error fetching past seasons:', err)
      setPastSeasons([])
    }
  }, [user, player?.id])

  // Load tabs data in background (slower)
  const loadTabsData = useCallback(async () => {
    if (!user || !player || tabsDataLoaded) return
    
    try {
      // Run all fetch functions in parallel for better performance
      Promise.allSettled([
        fetchGameHistory(),
        fetchCreatedGames(),
        fetchCreatedGroups(),
        fetchMemberGroups(),
        fetchUpcomingGames(),
        fetchUpcomingSeasons(),
        fetchPastSeasons()
      ]).then((results) => {
        // Log any failed requests for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const functionNames = [
              'fetchGameHistory',
              'fetchCreatedGames', 
              'fetchCreatedGroups',
              'fetchMemberGroups',
              'fetchUpcomingGames',
              'fetchUpcomingSeasons',
              'fetchPastSeasons'
            ]
            console.error(`Failed to fetch ${functionNames[index]}:`, result.reason)
          }
        })
        setTabsDataLoaded(true)
      })
    } catch (error) {
      console.error('Error loading tabs data:', error)
    }
  }, [user, player, tabsDataLoaded, fetchGameHistory, fetchCreatedGames, fetchCreatedGroups, fetchMemberGroups, fetchUpcomingGames, fetchUpcomingSeasons, fetchPastSeasons])

  useEffect(() => {
    if (user && player) {
      // Load basic data first (instant)
      loadBasicData()
      
      // Then load tabs data in background
      setTimeout(() => {
        loadTabsData()
      }, 100) // Small delay to ensure basic data loads first
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, player, authLoading, loadBasicData, loadTabsData])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }



  const calculateTotalHoursPlayed = () => {
    return gameHistory.reduce((total, history) => {
      return total + (history.games.duration_hours || 0)
    }, 0)
  }

  if (authLoading || (!basicDataLoaded && loading)) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Profile Header Skeleton */}
            <div className="text-center mb-12">
              <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-6 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded mx-auto mb-4 w-64 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded mx-auto w-48 animate-pulse"></div>
            </div>

            {/* Stats Skeleton */}
            <div className="flex justify-center gap-8 mb-12">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-xl mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Content Sections Skeleton */}
            <div className="space-y-12">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-6 bg-gray-200 rounded mb-6 w-48 animate-pulse"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="bg-gray-200 rounded-lg h-48 animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
            onSuccess={() => {
              setShowEditForm(false)
              window.location.reload()
            }}
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
      
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        {/* Profile Header - Luma Style */}
        <div className="text-center mb-8 md:mb-12">
          {/* Profile Photo */}
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            {player.photo_url ? (
              <Image
                src={player.photo_url}
                alt={player.name}
                width={128}
                height={128}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover"
              />
            ) : (
              <span className="text-3xl md:text-4xl text-gray-600 font-bold">
                {player.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">{player.name}</h1>
          
          {/* Joined Date */}
          <p className="text-xs md:text-sm text-gray-600 mb-8">Joined {formatDate(player.member_since)}</p>

          {/* Stats Cards */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-8">
            <div className="bg-gray-100 text-black rounded-xl px-4 md:px-5 py-2 md:py-3 text-center min-w-[90px] md:min-w-[110px]">
              <div className="text-2xl md:text-3xl font-bold mb-1">
                <AnimatedCounter value={createdGroups.length + createdGames.length} />
              </div>
              <div className="text-xs md:text-sm text-gray-700">Hosted</div>
            </div>
            <div className="bg-gray-100 text-black rounded-xl px-4 md:px-5 py-2 md:py-3 text-center min-w-[90px] md:min-w-[110px]">
              <div className="text-2xl md:text-3xl font-bold mb-1">
                <AnimatedCounter value={gameHistory.length} />
              </div>
              <div className="text-xs md:text-sm text-gray-700">Attended</div>
            </div>
            <div className="bg-gray-100 text-black rounded-xl px-4 md:px-5 py-2 md:py-3 text-center min-w-[90px] md:min-w-[110px]">
              <div className="text-2xl md:text-3xl font-bold mb-1">
                <AnimatedCounter value={calculateTotalHoursPlayed()} />
              </div>
              <div className="text-xs md:text-sm text-gray-700">Hours Played</div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <Button
            onClick={() => setShowEditForm(true)}
            variant="outline"
            className="mb-8 text-sm md:text-base"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>

          {/* Profile Details */}
          <div className="bg-gray-50 rounded-xl p-4 md:p-6 text-left max-w-2xl mx-auto space-y-6">
            {/* Experience Section */}
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Experience</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(player as { sport?: string }).sport && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Sport</p>
                    <p className="text-gray-900">{(player as { sport?: string }).sport}</p>
                  </div>
                )}
                {player.playing_experience && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Playing Experience</p>
                    <p className="text-gray-900">{player.playing_experience}</p>
                  </div>
                )}
                {player.skill_level && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Skill Level</p>
                    <p className="text-gray-900">{player.skill_level}</p>
                  </div>
                )}
                {player.favorite_team && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Favorite Team</p>
                    <p className="text-gray-900">{player.favorite_team}</p>
                  </div>
                )}
                {player.favorite_player && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Favorite Player</p>
                    <p className="text-gray-900">{player.favorite_player}</p>
                  </div>
                )}
              </div>
            </div>

            {/* About Section */}
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">About</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {player.home_location && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Location</p>
                    <p className="text-gray-900">{player.home_location}</p>
                  </div>
                )}
                {(player as { originally_from?: string }).originally_from && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Originally From</p>
                    <p className="text-gray-900">{(player as { originally_from?: string }).originally_from}</p>
                  </div>
                )}
                {player.languages && player.languages.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Languages</p>
                    <p className="text-gray-900">{player.languages.join(', ')}</p>
                  </div>
                )}
                {player.instagram && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Instagram</p>
                    <p className="text-gray-900">{player.instagram}</p>
                  </div>
                )}
                {player.other_sports && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Other Sports</p>
                    <p className="text-gray-900">{player.other_sports}</p>
                  </div>
                )}
              </div>
            </div>
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
            <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-md md:w-auto">
              {['upcoming', 'attended', 'groups'].map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'upcoming' | 'attended' | 'groups')}
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
                    {tab === 'upcoming' ? 'Upcoming' : tab === 'attended' ? 'Past' : 'Groups'}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'attended' && (
                <motion.div
                  key="attended"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {!tabsDataLoaded ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading your game history...</p>
                    </div>
                  ) : gameHistory.length === 0 && pastSeasons.length === 0 ? (
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
                            {pastSeasons.map((season) => {
                              // Use the centralized attendance service
                              const attendanceInfo = player ? isUserAttendingSeason(season, player.id) : { isAttending: false, hasPaid: false }
                              const playerCount = getSeasonPlayerCount(season)
                              
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
                                  groupName={Array.isArray(season.groups) ? season.groups[0]?.name : season.groups?.name || 'Unknown Group'}
                                  location={season.location}
                                  seasonSpotsAvailable={season.season_spots - playerCount}
                                  gameSpotsAvailable={season.game_spots}
                                  isUserAttending={attendanceInfo.isAttending}
                                  isPastSeason={true}
                                  seasonAttendees={season.season_attendees}
                                />
                              )
                            })}
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
                                      gameId={game.games.id}
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
                  {!tabsDataLoaded ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading your groups...</p>
                    </div>
                  ) : memberGroups.length === 0 ? (
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
                  {!tabsDataLoaded ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading your upcoming games...</p>
                    </div>
                  ) : upcomingGames.length === 0 && upcomingSeasons.length === 0 ? (
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
                            {upcomingSeasons.map((season) => {
                              // Use the centralized attendance service
                              const attendanceInfo = player ? isUserAttendingSeason(season, player.id) : { isAttending: false, hasPaid: false }
                              const playerCount = getSeasonPlayerCount(season)
                              
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
                                  groupName={Array.isArray(season.groups) ? season.groups[0]?.name : season.groups?.name || 'Unknown Group'}
                                  location={season.location}
                                  seasonSpotsAvailable={season.season_spots - playerCount}
                                  gameSpotsAvailable={season.game_spots}
                                  isUserAttending={attendanceInfo.isAttending}
                                  seasonAttendees={season.season_attendees}
                                />
                              )
                            })}
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
                                      gameId={game.games.id}
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

