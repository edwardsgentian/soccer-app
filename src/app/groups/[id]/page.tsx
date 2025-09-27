'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { ArrowLeft, Instagram, Globe, MessageCircle, Component, Users } from 'lucide-react'
import { GameManagementModal } from '@/components/games/game-management-modal'
import { HomepageGameCard } from '@/components/homepage-game-card'
import { SeasonCard } from '@/components/season-card'
import { useAuth } from '@/contexts/auth-context'

interface Player {
  id: string
  name: string
  email: string
  photo_url?: string
}

interface PlayerData {
  player_id: string
  players: {
    id: string
    name: string
    email: string
    photo_url?: string
  }[]
}

interface Group {
  id: string
  name: string
  description: string
  tags: string[]
  instagram?: string
  website?: string
  whatsapp_group?: string
  created_at: string
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
  const groupId = params.id as string
  const { player } = useAuth()
  
  const [group, setGroup] = useState<Group | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateGameModal, setShowCreateGameModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'games' | 'seasons' | 'players'>('games')
  const [players, setPlayers] = useState<Player[]>([])

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
        .gte('game_date', new Date().toISOString().split('T')[0])
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
        .gte('first_game_date', new Date().toISOString().split('T')[0])
        .order('first_game_date', { ascending: true })

      if (seasonsError) {
        console.error('Error fetching seasons:', seasonsError)
      } else {
        setSeasons(seasonsData || [])
      }

      // Fetch players (people who have attended games in this group)
      const { data: playersData, error: playersError } = await supabase
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
        .in('game_id', gamesData?.map(game => game.id) || [])

      if (playersError) {
        console.error('Error fetching players:', playersError)
      } else {
        console.log('Players data received:', playersData)
        // Remove duplicates and format players data
        const uniquePlayers = playersData?.reduce((acc: Player[], playerData: PlayerData) => {
          // Check if players array exists and has at least one element
          if (!playerData.players || !Array.isArray(playerData.players) || playerData.players.length === 0) {
            console.warn('Invalid player data structure:', playerData)
            return acc
          }
          
          const player = playerData.players[0] // Get the first (and only) player from the array
          if (!player || !player.id) {
            console.warn('Invalid player object:', player)
            return acc
          }
          
          const existingPlayer = acc.find(p => p.id === player.id)
          if (!existingPlayer) {
            acc.push({
              id: player.id,
              name: player.name,
              email: player.email,
              photo_url: player.photo_url
            })
          }
          return acc
        }, []) || []
        setPlayers(uniquePlayers)
      }
    } catch (err) {
      console.error('Error fetching group details:', err)
      setError('Failed to load group details')
    } finally {
      setLoading(false)
    }
  }, [groupId])

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
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => window.location.href = '/groups'}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Groups
        </Button>

        {/* Group Header - Profile Style */}
        <div className="text-center mb-12">
          {/* Group Icon */}
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Component className="w-16 h-16 text-gray-600" />
          </div>

          {/* Group Name */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>
          
          {/* Created Date */}
          <p className="text-gray-600 mb-8">Created {formatDate(group.created_at)}</p>

            {/* Group Stats */}
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{games.length}</div>
                <div className="text-sm text-gray-600">Games</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{seasons.length}</div>
                <div className="text-sm text-gray-600">Seasons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{players.length}</div>
                <div className="text-sm text-gray-600">Players</div>
              </div>
            </div>

          {/* About Section */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
            <p className="text-gray-600 leading-relaxed mb-6">{group.description}</p>

            {/* Tags */}
            {group.tags && group.tags.length > 0 && (
              <div className="mb-6 text-center">
                <div className="flex flex-wrap gap-2 justify-center">
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

            {/* Social Links */}
            <div className="text-center">
              <div className="flex flex-wrap justify-center gap-4">
                {group.whatsapp_group && (
                  <a
                    href={group.whatsapp_group}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-green-600 hover:text-green-700 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp Group
                  </a>
                )}
                {group.instagram && (
                  <a
                    href={group.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-pink-600 hover:text-pink-700 transition-colors"
                  >
                    <Instagram className="w-5 h-5 mr-2" />
                    Instagram
                  </a>
                )}
                {group.website && (
                  <a
                    href={group.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Globe className="w-5 h-5 mr-2" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Headers - Profile Style */}
        <div className="px-6 pt-6 flex justify-center">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('games')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md text-center flex items-center justify-center ${
                activeTab === 'games'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Games
            </button>
            <button
              onClick={() => setActiveTab('seasons')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md text-center flex items-center justify-center ${
                activeTab === 'seasons'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Seasons
            </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md text-center flex items-center justify-center ${
                  activeTab === 'players'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Players
              </button>
          </div>
        </div>

        {/* Add Game/Season Button */}
        {player && (
          <div className="px-6 pb-4 flex justify-center">
            <Button
              onClick={() => setShowCreateGameModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Add Game/Season
            </Button>
          </div>
        )}

        {/* Tabbed Content */}
        <div className="bg-white overflow-hidden">

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'games' && (
              <div className="space-y-6">
                {games.length > 0 ? (
                  games.map((game) => {
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
                  })
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
                        onClick={() => setShowCreateGameModal(true)}
                      >
                        Create First Game
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'seasons' && (
              <div className="space-y-6">
                {seasons.length > 0 ? (
                  seasons.map((season) => (
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
                  ))
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
                        onClick={() => setShowCreateGameModal(true)}
                      >
                        Create First Season
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

              {activeTab === 'players' && (
                <div className="space-y-6">
                  {players.length > 0 ? (
                    <div className="flex justify-center">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
                        {players.map((player) => (
                          <div key={player.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                              {player.photo_url ? (
                                <Image
                                  src={player.photo_url}
                                  alt={player.name}
                                  width={48}
                                  height={48}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-lg font-semibold text-gray-600">
                                  {player.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {player.name}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {player.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <Users className="w-16 h-16 text-gray-400 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No players yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Players will appear here once they attend games in this group.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Create Game Modal */}
      <GameManagementModal
        isOpen={showCreateGameModal}
        onClose={() => setShowCreateGameModal(false)}
        onGameCreated={() => {
          setShowCreateGameModal(false)
          fetchGroupDetails() // Refresh the group details
        }}
        groupId={groupId}
      />
    </div>
  )
}