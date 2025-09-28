'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, MapPin, SmilePlus, Lock } from "lucide-react"
import { motion } from 'framer-motion'

interface HomepageGameCardProps {
  gameName: string
  time: string
  price: number
  location: string
  maxAttendees: number
  groupName: string
  gameId: string
  tags: string[]
  seasonId?: string
  seasonSignupDeadline?: string
  isUserAttending?: boolean
  hasPurchasedSeason?: boolean
  gameAttendees?: {
    id: string
    player_id: string
    payment_status: string
    attendance_status?: 'attending' | 'not_attending'
  }[]
  seasonGameAttendance?: {
    attendance_status: 'attending' | 'not_attending'
    season_attendees: {
      id: string
      player_id: string
      payment_status: string
    }
  }[]
  isPastGame?: boolean
}

export function HomepageGameCard({
  gameName,
  time,
  price,
  location,
  maxAttendees,
  groupName,
  gameId,
  tags,
  seasonId,
  seasonSignupDeadline,
  isUserAttending = false,
  hasPurchasedSeason = false,
  gameAttendees = [],
  seasonGameAttendance = [],
  isPastGame = false
}: HomepageGameCardProps) {

  // Generate random gradient based on gameId for consistency
  const getRandomGradient = () => {
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
    
    // Use gameId to consistently select the same gradient
    const hash = gameId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return gradients[Math.abs(hash) % gradients.length]
  }

  const generateAvatarStack = () => {
    const avatars = []
    const maxAvatars = 3
    
    // Use actual game attendees data if available, otherwise fall back to attendees count
    const actualAttendees = gameAttendees?.filter(att => att.payment_status === 'completed') || []
    const attendeeCount = actualAttendees.length
    const avatarCount = Math.min(attendeeCount, maxAvatars)
    
    // If no attendees, show empty state avatar
    if (attendeeCount === 0) {
      return (
        <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
          <SmilePlus className="w-3 h-3 text-gray-500" />
        </div>
      )
    }
    
    // Generate realistic user initials
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
    
    // Add "+X more" indicator if there are more attendees
    if (attendeeCount > maxAvatars) {
      avatars.push(
        <div
          key="more"
          className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-600"
          style={{ marginLeft: '-8px', zIndex: 0 }}
        >
          +{attendeeCount - maxAvatars}
        </div>
      )
    }
    
    return avatars
  }

  // Calculate actual attendee count based on attendance status
  const individualAttendees = gameAttendees?.filter(att => 
    att.payment_status === 'completed' && 
    (att.attendance_status === 'attending' || !att.attendance_status)
  ) || []
  
  // Count season attendees who are attending this specific game
  const seasonAttendees = seasonGameAttendance?.filter(att => 
    att.attendance_status === 'attending' && 
    att.season_attendees.payment_status === 'completed'
  ) || []
  
  // Remove duplicates - if someone is both an individual and season attendee, only count them once
  // Prioritize season attendance over individual attendance
  const allAttendees = [...individualAttendees, ...seasonAttendees]
  const uniqueAttendees = allAttendees.filter((attendee, index, self) => {
    const attendeePlayerId = 'player_id' in attendee ? attendee.player_id : attendee.season_attendees?.player_id
    
    // Find all attendees with the same player_id
    const duplicates = self.filter(a => {
      const aPlayerId = 'player_id' in a ? a.player_id : a.season_attendees?.player_id
      return aPlayerId === attendeePlayerId
    })
    
    // If there are duplicates, prioritize season attendance
    if (duplicates.length > 1) {
      const hasSeasonAttendance = duplicates.some(d => 'season_attendees' in d)
      if (hasSeasonAttendance) {
        // Only keep the season attendance
        return 'season_attendees' in attendee
      }
    }
    
    // If no duplicates or no season attendance, keep the first occurrence
    return index === self.findIndex(a => {
      const aPlayerId = 'player_id' in a ? a.player_id : a.season_attendees?.player_id
      return aPlayerId === attendeePlayerId
    })
  })
  
  const actualAttendeeCount = uniqueAttendees.length
  const availableSpots = maxAttendees - actualAttendeeCount

  // Debug: Log detailed attendee count for season games
  if (seasonId) {
    console.log(`=== GAME CARD DEBUG: ${gameName} ===`)
    console.log('Game ID:', gameId)
    console.log('maxAttendees:', maxAttendees)
    console.log('gameAttendees raw:', gameAttendees)
    console.log('individualAttendees filtered:', individualAttendees)
    console.log('seasonGameAttendance raw:', seasonGameAttendance)
    console.log('seasonAttendees filtered:', seasonAttendees)
    console.log('uniqueAttendees after deduplication (by name):', uniqueAttendees)
    console.log('total attending:', actualAttendeeCount)
    console.log('available spots:', availableSpots)
    
    // Detailed breakdown
    console.log('--- INDIVIDUAL ATTENDEES BREAKDOWN ---')
    individualAttendees.forEach((att, index) => {
      console.log(`Individual ${index + 1}:`, {
        player_id: att.player_id,
        payment_status: att.payment_status,
        attendance_status: att.attendance_status
      })
    })
    
    console.log('--- SEASON ATTENDEES BREAKDOWN ---')
    seasonAttendees.forEach((att, index) => {
      console.log(`Season ${index + 1}:`, {
        attendance_status: att.attendance_status,
        season_attendee_id: att.season_attendees?.id,
        player_id: att.season_attendees?.player_id,
        payment_status: att.season_attendees?.payment_status
      })
    })
    
    console.log('--- UNIQUE ATTENDEES BREAKDOWN ---')
    uniqueAttendees.forEach((att, index) => {
      console.log(`Unique ${index + 1}:`, {
        player_id: 'player_id' in att ? att.player_id : att.season_attendees?.player_id,
        attendance_status: att.attendance_status,
        payment_status: 'payment_status' in att ? att.payment_status : att.season_attendees?.payment_status,
        type: 'player_id' in att ? 'individual' : 'season',
        raw_individual_player_id: 'player_id' in att ? att.player_id : undefined,
        raw_season_player_id: 'season_attendees' in att ? att.season_attendees?.player_id : undefined
      })
    })
    
    console.log('--- DEDUPLICATION DEBUG ---')
    console.log('All attendees before deduplication:', allAttendees.map(att => ({
      player_id: 'player_id' in att ? att.player_id : att.season_attendees?.player_id,
      type: 'player_id' in att ? 'individual' : 'season'
    })))
    
    // Debug the deduplication logic step by step
    allAttendees.forEach((attendee, index) => {
      const attendeePlayerId = 'player_id' in attendee ? attendee.player_id : attendee.season_attendees?.player_id
      const duplicates = allAttendees.filter(a => {
        const aPlayerId = 'player_id' in a ? a.player_id : a.season_attendees?.player_id
        return aPlayerId === attendeePlayerId
      })
      console.log(`Attendee ${index + 1} (${attendeePlayerId}):`, {
        type: 'player_id' in attendee ? 'individual' : 'season',
        duplicates_count: duplicates.length,
        has_season_attendance: duplicates.some(d => 'season_attendees' in d),
        will_keep: duplicates.length > 1 ? 
          (duplicates.some(d => 'season_attendees' in d) ? 'season_attendees' in attendee : false) :
          true
      })
    })
    
    console.log('=====================================')
  }
  
  // Check if season signup period is still open
  const isSeasonSignupOpen = seasonSignupDeadline && new Date(seasonSignupDeadline) > new Date()
  
  // If this is a season game and signup is still open, no one can join individual games
  // UNLESS they have already purchased the season
  const requiresSeasonSignup = seasonId && isSeasonSignupOpen && !hasPurchasedSeason
  

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="max-w-lg mx-auto"
    >
      <Link href={requiresSeasonSignup ? `/seasons/${seasonId}` : `/games/${gameId}`} className="block">
        <div
          className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 flex flex-row"
        >
        {/* Image Section - Left Side */}
        <div className={`w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-br ${getRandomGradient()} rounded-lg ml-4 mt-4 flex items-center justify-center relative flex-shrink-0`}>
          <div className="w-8 h-8 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
            <Image 
              src="/game.png" 
              alt="Game" 
              width={64} 
              height={64} 
              className="w-8 h-8 sm:w-16 sm:h-16 rounded-full object-cover"
            />
          </div>
        </div>

        {/* Content Section - Right Side */}
        <div className="flex-1 p-4 pt-4">
          {/* Top Row: Game Name + Price/Completed */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-gray-900 text-lg">{gameName}</h3>
            
            {/* Price or Status Badge in top right */}
            {isPastGame ? (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                Closed
              </span>
            ) : isUserAttending ? (
              <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                Attending
              </span>
            ) : hasPurchasedSeason ? (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                Not Attending
              </span>
            ) : requiresSeasonSignup ? (
              <div className="relative group">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                </span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-48">
                  Individual games will only be available to book after the season signup has ended
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            ) : (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm font-medium">
                ${price}
              </span>
            )}
          </div>

          {/* Time and Location */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center text-gray-600 text-sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <span>{time}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-2 text-gray-500" />
              <span>{location}</span>
            </div>
          </div>

          {/* Spots Available */}
          <div className="flex items-center mb-3">
            <div className="flex items-center -space-x-2 mr-2">
              {generateAvatarStack()}
            </div>
            <span className={`text-sm font-medium ${availableSpots <= 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {availableSpots <= 0
                ? 'Fully Booked'
                : isPastGame
                  ? `${actualAttendeeCount} attended`
                  : `${availableSpots} spots available`}
            </span>
          </div>

          {/* Group Name */}
          <p className="text-sm font-bold text-gray-900 mb-3">{groupName}</p>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
    </motion.div>
  )
}