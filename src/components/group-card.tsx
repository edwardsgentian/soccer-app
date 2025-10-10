'use client'

import { Component, Calendar, Users } from 'lucide-react'
import Image from 'next/image'

interface Group {
  id: string
  name: string
  description: string
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
    season_attendees?: Array<{
      player_id: string
    }>
  }>
}

interface GroupCardProps {
  group: Group
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => window.location.href = `/groups/${group.id}`}
    >
      <div className="p-6 text-center">
        {/* Group Image - Same size as icons */}
        <div className="flex justify-center mb-4">
          {group.photo_url ? (
            <Image
              src={group.photo_url}
              alt={group.name}
              width={64}
              height={64}
              className="w-16 h-16 rounded object-cover"
            />
          ) : (
            <Component className="w-16 h-16 text-gray-400" />
          )}
        </div>

        {/* Group Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-4">{group.name}</h3>

        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {group.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-6">
          {/* Upcoming Games Count */}
          <div className="flex items-center text-gray-600 text-sm">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{(() => {
              const today = new Date().toISOString().split('T')[0]
              return group.games?.filter(game => game.game_date >= today).length || 0
            })()}</span>
          </div>

          {/* Player Count */}
          <div className="flex items-center text-gray-600 text-sm">
            <Users className="w-4 h-4 mr-2" />
            <span>{(() => {
              // Check if we have attendee data (groups page)
              if (group.games?.some(game => game.game_attendees) || group.seasons?.some(season => season.season_attendees)) {
                const allPlayerIds = new Set<string>()
                // Add game attendees
                group.games?.forEach(game => {
                  game.game_attendees?.forEach(attendee => {
                    allPlayerIds.add(attendee.player_id)
                  })
                })
                // Add season attendees
                group.seasons?.forEach(season => {
                  season.season_attendees?.forEach(attendee => {
                    allPlayerIds.add(attendee.player_id)
                  })
                })
                return allPlayerIds.size
              } else {
                // Fallback for profile page - show total games count
                return `${group.games?.length || 0} games`
              }
            })()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
