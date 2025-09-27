'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, MapPin, Calendar, SmilePlus } from 'lucide-react'

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
  isUserAttending?: boolean
  isPastSeason?: boolean
}

const gradients = [
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100',
  'from-stone-200 to-yellow-100'
]

const getRandomGradient = (seasonId: string) => {
  const hash = seasonId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return gradients[Math.abs(hash) % gradients.length]
}

const generateAvatarStack = (attendees: number, maxAvatars: number) => {
  const avatars = []
  const avatarCount = Math.min(attendees, maxAvatars)
  
  // If no attendees, show empty state avatar
  if (attendees === 0) {
    return (
      <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
        <SmilePlus className="w-3 h-3 text-gray-500" />
      </div>
    )
  }
  
  const userInitials = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  const avatarColors = [
    'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400', 
    'bg-yellow-400', 'bg-red-400', 'bg-indigo-400', 'bg-teal-400',
    'bg-orange-400', 'bg-cyan-400'
  ]
  
  for (let i = 0; i < avatarCount; i++) {
    const colorIndex = i % avatarColors.length
    avatars.push(
      <div
        key={i}
        className={`w-6 h-6 rounded-full ${avatarColors[colorIndex]} border-2 border-white flex items-center justify-center text-xs font-semibold text-white`}
        style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: maxAvatars - i }}
      >
        {userInitials[i]}
      </div>
    )
  }
  
  if (attendees > maxAvatars) {
    avatars.push(
      <div
        key="more"
        className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-600"
        style={{ marginLeft: '-8px', zIndex: 0 }}
      >
        +{attendees - maxAvatars}
      </div>
    )
  }
  
  return avatars
}

export function SeasonCard({
  seasonId,
  seasonName,
  seasonPrice,
  totalGames,
  seasonSpots,
  firstGameDate,
  firstGameTime,
  repeatType,
  groupName,
  location,
  seasonSpotsAvailable,
  isUserAttending = false,
  isPastSeason = false,
}: SeasonCardProps) {
  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatFirstGameDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.toLocaleDateString('en-US', { weekday: 'long' })
    const dateFormatted = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    return `${day}, ${dateFormatted}`
  }

  const getRepeatDisplay = (repeatType: string) => {
    if (repeatType === 'weekly') return '(weekly)'
    if (repeatType === 'bi-weekly') return '(bi-weekly)'
    return '' // Show nothing for custom
  }

  const seasonAttendees = seasonSpots - seasonSpotsAvailable

  return (
    <Link href={`/seasons/${seasonId}`} className="block">
      <div className="relative max-w-lg mx-auto">
        {/* Stack of cards effect - positioned below main card */}
        <div className="absolute top-2 left-0 w-full h-full border border-gray-300 rounded-lg"></div>
        <div className="absolute top-1 left-0 w-full h-full border border-gray-300 rounded-lg"></div>
        <div className="relative bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-300 flex flex-row">
        {/* Image Section - Left Side */}
        <div className={`w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-br ${getRandomGradient(seasonId)} rounded-lg ml-4 mt-4 flex items-center justify-center relative flex-shrink-0`}>
          <div className="w-8 h-8 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
            <Image 
              src="/calendar.png" 
              alt="Calendar" 
              width={64} 
              height={64} 
              className="w-8 h-8 sm:w-16 sm:h-16 rounded-full object-cover"
            />
          </div>
        </div>

        {/* Content Section - Right Side */}
        <div className="flex-1 p-4 pt-4">
          {/* Top Row: Season Name + Price */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-lg">{seasonName}</h3>
            
            {/* Season Price or Attending status in top right */}
            {isPastSeason ? (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                Completed
              </span>
            ) : isUserAttending ? (
              <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                Attending
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm font-medium">
                ${seasonPrice}
              </span>
            )}
          </div>

          {/* Time and Location */}
          <div className="space-y-1 mb-4">
            <div className="flex items-center text-gray-600 text-sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <span>{formatTime(firstGameTime)}</span>
              <Calendar className="w-4 h-4 ml-2 mr-2 text-gray-500" />
              <span>Starts {formatFirstGameDate(firstGameDate)}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-2 text-gray-500" />
              <span>{location}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <span>{totalGames} games {getRepeatDisplay(repeatType)}</span>
            </div>
          </div>

          {/* Spots Available */}
          <div className="flex items-center mb-3">
            <div className="flex items-center -space-x-2 mr-2">
              {generateAvatarStack(seasonAttendees, 3)}
            </div>
            <span className={`text-sm font-medium ${seasonSpotsAvailable <= 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {seasonSpotsAvailable <= 0
                ? 'Season Full'
                : `${seasonSpotsAvailable} season spots available`}
            </span>
          </div>

          {/* Group Name */}
          <p className="text-sm font-bold text-gray-900 mb-3">{groupName}</p>

          {/* Season Info Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              Intermediate
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              Outdoors
            </span>
          </div>
        </div>
        </div>
      </div>
    </Link>
  )
}
