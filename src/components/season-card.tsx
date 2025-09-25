'use client'

import Link from 'next/link'
import { Calendar, Clock, MapPin, Users, DollarSign, Component } from 'lucide-react'

interface SeasonCardProps {
  seasonId: string
  seasonName: string
  description?: string
  seasonPrice: number
  individualGamePrice: number
  totalGames: number
  seasonSpots: number
  gameSpots: number
  firstGameDate: string
  firstGameTime: string
  repeatType: string
  groupName: string
  location: string
  seasonSpotsAvailable: number
  gameSpotsAvailable: number
}

export function SeasonCard({
  seasonId,
  seasonName,
  description,
  seasonPrice,
  individualGamePrice,
  totalGames,
  seasonSpots,
  gameSpots,
  firstGameDate,
  firstGameTime,
  repeatType,
  groupName,
  location,
  seasonSpotsAvailable,
  gameSpotsAvailable,
}: SeasonCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
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

  return (
    <Link href={`/seasons/${seasonId}`} className="block">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* Season Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Component className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{seasonName}</h3>
                <p className="text-sm text-gray-600">{groupName}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">${seasonPrice}</div>
              <div className="text-sm text-gray-500">Season Pass</div>
            </div>
          </div>
        </div>

        {/* Season Details */}
        <div className="p-4">
          {description && (
            <p className="text-gray-600 text-sm mb-3">{description}</p>
          )}

          {/* Season Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center text-gray-600 text-sm">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <span>{totalGames} games</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <span>{repeatType}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-2 text-gray-500" />
              <span>{location}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
              <span>${individualGamePrice}/game</span>
            </div>
          </div>

          {/* First Game */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-sm font-medium text-gray-900 mb-1">First Game</div>
            <div className="text-sm text-gray-600">
              {formatDate(firstGameDate)} at {formatTime(firstGameTime)}
            </div>
          </div>

          {/* Spots Available */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm">
                <Users className="w-4 h-4 mr-1 text-gray-500" />
                <span className="text-gray-600">
                  {seasonSpotsAvailable} season spots
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Users className="w-4 h-4 mr-1 text-gray-500" />
                <span className="text-gray-600">
                  {gameSpotsAvailable} game spots
                </span>
              </div>
            </div>
            <div className="text-sm font-medium text-blue-600">
              Join Season
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
