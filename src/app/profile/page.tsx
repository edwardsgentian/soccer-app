'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/profile/profile-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Header } from '@/components/header'
import { Calendar, MapPin, Edit, Trophy, Users } from 'lucide-react'

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
}

export default function ProfilePage() {
  const { user, player, loading: authLoading } = useAuth()
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [createdGames, setCreatedGames] = useState<CreatedGame[]>([])
  const [createdGroups, setCreatedGroups] = useState<CreatedGroup[]>([])
  const [memberGroups, setMemberGroups] = useState<CreatedGroup[]>([])
  const [upcomingGames, setUpcomingGames] = useState<GameHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'attended' | 'groups' | 'upcoming'>('upcoming')

  const fetchGameHistory = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('game_attendees')
        .select(`
          id,
          created_at,
          amount_paid,
          games (
            name,
            game_date,
            location,
            duration_hours,
            groups (
              name
            )
          )
        `)
        .eq('player_id', user.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching game history:', error)
      } else {
        setGameHistory((data as unknown as GameHistory[]) || [])
      }
    } catch (err) {
      console.error('Error fetching game history:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

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
          created_at
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
              created_by
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
      const { data, error } = await supabase
        .from('game_attendees')
        .select(`
          id,
          created_at,
          amount_paid,
          games!inner (
            name,
            game_date,
            game_time,
            location,
            duration_hours,
            groups (
              name
            )
          )
        `)
        .eq('player_id', user.id)
        .eq('payment_status', 'completed')
        .gte('games.game_date', new Date().toISOString().split('T')[0])
        .order('games.game_date', { ascending: true })

      if (error) {
        console.error('Error fetching upcoming games:', error)
      } else {
        setUpcomingGames((data as unknown as GameHistory[]) || [])
      }
    } catch (err) {
      console.error('Error fetching upcoming games:', err)
    }
  }, [user])

  useEffect(() => {
    if (user && player) {
      fetchGameHistory()
      fetchCreatedGames()
      fetchCreatedGroups()
      fetchMemberGroups()
      fetchUpcomingGames()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, player, authLoading, fetchGameHistory, fetchCreatedGames, fetchCreatedGroups, fetchMemberGroups, fetchUpcomingGames])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
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
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sign In Required
            </h3>
            <p className="text-gray-600 mb-6">
              Please sign in to view your profile.
            </p>
            <Button
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
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
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Profile Header - Luma Style */}
        <div className="text-center mb-12">
          {/* Profile Photo */}
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.name}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <span className="text-4xl text-gray-600 font-bold">
                {player.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{player.name}</h1>
          
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
          {/* Tab Headers - Luma Style with Sliding Animation */}
          <div className="px-6 pt-6 flex justify-center">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 text-center flex items-center justify-center ${
                  activeTab === 'upcoming'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('attended')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 text-center flex items-center justify-center ${
                  activeTab === 'attended'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Past
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 text-center flex items-center justify-center ${
                  activeTab === 'groups'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Groups
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'attended' && (
              /* Attended Content */
              <div>
                {gameHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No games attended yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gameHistory.map((game) => (
                      <div key={game.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{game.games.name}</h3>
                          <span className="text-sm text-gray-500">{formatDate(game.games.game_date)}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{game.games.location}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{game.games.groups.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


            {activeTab === 'groups' && (
              /* Groups Content */
              <div>
                {memberGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No groups joined yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {memberGroups.map((group) => (
                      <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{group.name}</h3>
                          <span className="text-sm text-gray-500">
                            {group.created_by === user?.id ? 'Organizer' : 'Member'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{group.description}</p>
                        <p className="text-gray-400 text-xs">{formatDate(group.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'upcoming' && (
              /* Upcoming Games Content */
              <div>
                {upcomingGames.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No upcoming games registered.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingGames.map((game) => (
                      <div key={game.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{game.games.name}</h3>
                          <span className="text-sm text-gray-500">{formatDate(game.games.game_date)}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm mb-2">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>{formatTime(game.games.game_time)}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{game.games.location}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{game.games.groups.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  )
}

