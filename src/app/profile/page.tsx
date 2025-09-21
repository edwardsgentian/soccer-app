'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/profile/profile-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Header } from '@/components/header'
import { Calendar, MapPin, Globe, Edit, Trophy, Users } from 'lucide-react'

interface GameHistory {
  id: string
  created_at: string
  amount_paid: number
  games: {
    name: string
    game_date: string
    location: string
    groups: {
      name: string
    }
  }
}

export default function ProfilePage() {
  const { user, player, loading: authLoading } = useAuth()
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)

  useEffect(() => {
    if (user && player) {
      fetchGameHistory()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, player, authLoading, fetchGameHistory])

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
        setGameHistory(data || [])
      }
    } catch (err) {
      console.error('Error fetching game history:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
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
              className="bg-green-600 hover:bg-green-700"
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Photo */}
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl text-white font-bold">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{player.name}</h1>
                  <p className="text-gray-600">{player.email}</p>
                </div>
                <Button
                  onClick={() => setShowEditForm(true)}
                  className="mt-4 md:mt-0 bg-green-600 hover:bg-green-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              {/* Member Since */}
              <div className="flex items-center text-gray-600 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Member since {formatDate(player.member_since)}</span>
              </div>

              {/* Location */}
              {player.home_location && (
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{player.home_location}</span>
                </div>
              )}

              {/* Instagram */}
              {player.instagram && (
                <div className="flex items-center text-gray-600">
                  <Globe className="w-4 h-4 mr-2" />
                  <a
                    href={`https://instagram.com/${player.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-pink-600 transition-colors"
                  >
                    {player.instagram}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Soccer Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Soccer Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {player.playing_experience && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Playing Experience</h3>
                    <p className="text-gray-600">{player.playing_experience}</p>
                  </div>
                )}

                {player.skill_level && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Skill Level</h3>
                    <p className="text-gray-600">{player.skill_level}</p>
                  </div>
                )}

                {player.favorite_team && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Favorite Team</h3>
                    <p className="text-gray-600">{player.favorite_team}</p>
                  </div>
                )}

                {player.favorite_player && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Favorite Player</h3>
                    <p className="text-gray-600">{player.favorite_player}</p>
                  </div>
                )}

                {player.other_sports && (
                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-1">Other Sports</h3>
                    <p className="text-gray-600">{player.other_sports}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Game History */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Game History</h2>
              
              {gameHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No games attended yet.</p>
                  <Button
                    onClick={() => window.location.href = '/games'}
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    Find Games
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {gameHistory.map((game) => (
                    <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{game.games.name}</h3>
                        <span className="text-green-600 font-semibold">${game.amount_paid}</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{formatDate(game.games.game_date)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{game.games.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          <span>{game.games.groups.name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              
              <div className="space-y-3">
                {player.languages && player.languages.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {player.languages.map((lang, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {player.time_in_nyc && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Time in NYC</h4>
                    <p className="text-gray-600">{player.time_in_nyc}</p>
                  </div>
                )}

                {player.phone && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Phone</h4>
                    <p className="text-gray-600">{player.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stats</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Games Attended</span>
                  <span className="font-semibold text-green-600">{gameHistory.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Spent</span>
                  <span className="font-semibold text-green-600">
                    ${gameHistory.reduce((sum, game) => sum + game.amount_paid, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
