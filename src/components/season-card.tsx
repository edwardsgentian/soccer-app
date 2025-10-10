'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, MapPin, Calendar, SmilePlus, CalendarCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { AnimatedAvatarGroup } from '@/components/ui/animated-avatar-group'

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
  seasonAttendees?: Array<{
    id: string
    player_id: string
    payment_status: string
    players?: {
      name: string
      photo_url?: string
    }
  }>
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

const generateAvatarStack = (attendees: number, maxAvatars: number, seasonAttendees?: SeasonCardProps['seasonAttendees']) => {
  // If no attendees, show empty state avatar
  if (attendees === 0) {
    return (
      <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
        <SmilePlus className="w-3 h-3 text-gray-500" />
      </div>
    )
  }
  
  // Use real player data if available, otherwise fall back to mock data
  let avatarData
  if (seasonAttendees && seasonAttendees.length > 0) {
    // Filter to only completed payments and get unique players
    const actualAttendees = seasonAttendees.filter(att => att.payment_status === 'completed')
    const uniqueAttendees = actualAttendees.filter((attendee, index, self) =>
      index === self.findIndex(a => a.player_id === attendee.player_id)
    )
    
    avatarData = uniqueAttendees.slice(0, maxAvatars).map((attendee, index) => {
      // Handle both array and object cases for players
      const player = Array.isArray(attendee.players) ? attendee.players[0] : attendee.players
      return {
        id: attendee.id || `season-attendee-${index}`,
        name: player?.name || `Player ${index + 1}`,
        photo_url: player?.photo_url,
        fallback: player?.name?.charAt(0).toUpperCase() || String.fromCharCode(65 + index)
      }
    })
  } else {
    // Fallback to mock data if no real data available
    avatarData = Array.from({ length: Math.min(attendees, maxAvatars) }, (_, index) => ({
      id: `season-attendee-${index}`,
      name: `Player ${index + 1}`,
      fallback: String.fromCharCode(65 + index) // A, B, C, etc.
    }))
  }
  
  return (
    <AnimatedAvatarGroup
      avatars={avatarData}
      maxVisible={maxAvatars}
      size="sm"
      overlap={8}
      hoverEffect="lift"
    />
  )
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
  seasonAttendees,
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

  const seasonAttendeesCount = seasonSpots - seasonSpotsAvailable

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="max-w-lg mx-auto"
    >
      <Link href={`/seasons/${seasonId}`} className="block">
        <div className="relative">
          {/* Stack of cards effect - positioned below main card */}
          <div className="absolute top-2 left-0 w-full h-full border border-gray-300 rounded-lg"></div>
          <div className="absolute top-1 left-0 w-full h-full border border-gray-300 rounded-lg"></div>
          <div className="relative bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 flex flex-row">
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
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                Completed
              </span>
            ) : isUserAttending ? (
              <span className="px-3 py-2 bg-green-100 text-green-600 text-xs font-medium rounded-md flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
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
              {generateAvatarStack(seasonAttendeesCount, 3, seasonAttendees)}
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
    </motion.div>
  )
}
