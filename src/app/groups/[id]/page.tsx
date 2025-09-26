'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Calendar, ArrowLeft, Instagram, Globe, MessageCircle, Component } from 'lucide-react'
import { GameManagementModal } from '@/components/games/game-management-modal'
import { HomepageGameCard } from '@/components/homepage-game-card'
import { SeasonCard } from '@/components/season-card'
import { useAuth } from '@/contexts/auth-context'

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
    include_organizer_in_count: boolean
  }
  game_attendees?: {
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
  include_organizer_in_count?: boolean
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

  const fetchGroupDetails = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select(`
          *,
          organizer:players!created_by (
            id,
            name,
            photo_url
          )
        `)
        .eq('id', groupId)
        .single()

      if (groupError) {
        throw groupError
      }

      setGroup(groupData)

      // Fetch games for this group
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          seasons (
            id,
            season_signup_deadline,
            include_organizer_in_count
          ),
          game_attendees (
            id,
            player_id,
            payment_status
          )
        `)
        .eq('group_id', groupId)
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })

      if (gamesError) {
        console.error('Error fetching games:', gamesError)
      } else {
        setGames((gamesData as unknown as Game[]) || [])
      }

      // Fetch seasons for this group
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select(`
          *,
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
        setSeasons((seasonsData as unknown as Season[]) || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Group not found')
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
      weekday: 'long',
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
          <div className="text-center py-12">
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
      
      <div className="container mx-auto px-4 py-16">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => window.location.href = '/groups'}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Groups
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Group Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-8">
              {/* Group Header */}
              <div className="h-32 bg-gray-50 flex items-center justify-center">
                <Component className="w-8 h-8 text-gray-400" />
              </div>

              <div className="p-6">
                {/* Group Name */}
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{group.name}</h1>

                
                {/* Description */}
                <p className="text-gray-600 mb-6">{group.description}</p>

                {/* Tags */}
                {group.tags && group.tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                <div className="space-y-3 mb-6">
                  {group.instagram && (
                    <a
                      href={`https://instagram.com/${group.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-600 hover:text-pink-600 transition-colors"
                    >
                      <Instagram className="w-5 h-5 mr-3" />
                      <span>{group.instagram}</span>
                    </a>
                  )}
                  {group.website && (
                    <a
                      href={group.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Globe className="w-5 h-5 mr-3" />
                      <span>Visit Website</span>
                    </a>
                  )}
                  {group.whatsapp_group && (
                    <a
                      href={group.whatsapp_group}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-600 hover:text-green-600 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5 mr-3" />
                      <span>Join WhatsApp Group</span>
                    </a>
                  )}
                </div>

                {/* Created Date */}
                <div className="flex items-center text-gray-500 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Created {formatDate(group.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Games List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Upcoming Games
                </h2>
                <p className="text-gray-600">
                  Games organized by {group.name}
                </p>
              </div>
              <Button
                onClick={() => setShowCreateGameModal(true)}
                size="sm"
              >
                Create Game
              </Button>
            </div>

            {games.length === 0 && seasons.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚽</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No upcoming games or seasons
                </h3>
                <p className="text-gray-600 mb-6">
                  This group hasn&apos;t scheduled any games or seasons yet.
                </p>
                <Button
                  onClick={() => setShowCreateGameModal(true)}
                >
                  Create First Game
                </Button>
              </div>
            ) : (
              <>
                {/* Seasons Section */}
                {seasons.length > 0 && (
                  <div className="max-w-lg mx-auto mb-8">
                    {seasons.map((season) => {
                      // Calculate season attendees including organizer if they should be included
                      let seasonAttendees = season.season_attendees?.filter(att => att.payment_status === 'completed').length || 0
                      
                      // If organizer should be included in count, add 1
                      if (season.include_organizer_in_count) {
                        seasonAttendees += 1
                      }
                      
                      const seasonSpotsAvailable = season.season_spots - seasonAttendees
                      const gameSpotsAvailable = season.game_spots
                      
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
                          groupName={group?.name || ''}
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
                          
                          return (
                            <HomepageGameCard
                              key={game.id}
                              gameName={game.name}
                              time={game.game_time}
                              price={game.price}
                              location={game.location}
                              maxAttendees={game.total_tickets}
                              groupName={group.name}
                              gameId={game.id}
                              tags={group.tags || []}
                              seasonId={game.season_id || game.seasons?.id}
                              seasonSignupDeadline={game.season_signup_deadline || game.seasons?.season_signup_deadline}
                              isUserAttending={isUserAttending}
                              gameAttendees={game.game_attendees}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
                </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
