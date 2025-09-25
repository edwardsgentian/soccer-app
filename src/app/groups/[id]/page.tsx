'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Calendar, Clock, MapPin, Users, ArrowLeft, Instagram, Globe, MessageCircle, Ticket, Component } from 'lucide-react'
import { GameManagementModal } from '@/components/games/game-management-modal'
import { HomepageGameCard } from '@/components/homepage-game-card'

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
}

export default function GroupDetailPage() {
  const params = useParams()
  const groupId = params.id as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [games, setGames] = useState<Game[]>([])
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
        .select('*')
        .eq('group_id', groupId)
        .gte('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: true })

      if (gamesError) {
        console.error('Error fetching games:', gamesError)
      } else {
        setGames((gamesData as unknown as Game[]) || [])
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

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
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

            {games.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚽</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No upcoming games
                </h3>
                <p className="text-gray-600 mb-6">
                  This group hasn&apos;t scheduled any games yet.
                </p>
                <Button
                  onClick={() => setShowCreateGameModal(true)}
                >
                  Create First Game
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {games.map((game) => {
                  const attendees = game.total_tickets - game.available_tickets
                  const isFullyBooked = game.available_tickets <= 0
                  const spotsLeft = game.available_tickets

                  return (
                    <div key={game.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                      {/* Game Header */}
                      <div className="h-24 bg-gray-50 flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{game.name}</h3>
                            {game.description && (
                              <p className="text-gray-600 text-sm mb-3">{game.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">${game.price}</div>
                            <div className="text-sm text-gray-500">per player</div>
                          </div>
                        </div>

                        {/* Game Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{formatDate(game.game_date)}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>{formatTime(game.game_time)}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>{game.location}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <Users className="w-4 h-4 mr-2" />
                            <span>{attendees}/{game.total_tickets} players</span>
                            {!isFullyBooked && (
                              <span className="ml-2 text-sm text-blue-600">
                                ({spotsLeft} spots left)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button 
                            asChild
                            variant="outline" 
                            className="flex-1"
                          >
                            <Link href={`/games/${game.id}`}>
                              View Details
                            </Link>
                          </Button>
                          <Button 
                            className={`flex-1 ${
                              isFullyBooked 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : ''
                            }`}
                            disabled={isFullyBooked}
                          >
                            {isFullyBooked ? 'Fully Booked' : 'Buy Game'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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
