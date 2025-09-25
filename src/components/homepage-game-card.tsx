'use client'

import Link from 'next/link'
import { Clock, MapPin } from "lucide-react"
import { motion } from 'framer-motion'

interface HomepageGameCardProps {
  gameName: string
  time: string
  price: number
  location: string
  attendees: number
  maxAttendees: number
  groupName: string
  gameId: string
  tags: string[]
}

export function HomepageGameCard({
  gameName,
  time,
  price,
  location,
  attendees,
  maxAttendees,
  groupName,
  gameId,
  tags
}: HomepageGameCardProps) {

  // Generate random gradient based on gameId for consistency
  const getRandomGradient = () => {
    const gradients = [
      'from-blue-200 to-blue-300',
      'from-green-200 to-green-300',
      'from-purple-200 to-pink-200',
      'from-pink-200 to-pink-300',
      'from-red-200 to-red-300',
      'from-yellow-200 to-yellow-300',
      'from-indigo-200 to-indigo-300',
      'from-teal-200 to-teal-300',
      'from-orange-200 to-orange-300',
      'from-cyan-200 to-cyan-300',
      'from-emerald-200 to-emerald-300',
      'from-violet-200 to-violet-300'
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
    const avatarCount = Math.min(attendees, maxAvatars)
    
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

  const isPastGame = price === 0
  const availableSpots = maxAttendees - attendees
  

  return (
    <Link href={`/games/${gameId}`} className="block">
      <motion.div
        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-row max-w-lg mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Image Section - Left Side */}
        <div className={`w-24 h-24 bg-gradient-to-br ${getRandomGradient()} rounded-lg ml-4 mt-4 flex items-center justify-center relative flex-shrink-0`}>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
            <span className="text-gray-600 font-bold text-lg">⚽</span>
          </div>
        </div>

        {/* Content Section - Right Side */}
        <div className="flex-1 p-4 pt-4">
          {/* Top Row: Game Name + Price/Completed */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-gray-900 text-lg">{gameName}</h3>
            
            {/* Price or Completed Badge in top right */}
            {isPastGame ? (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                Completed
              </span>
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
                  ? `${attendees} attended`
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
      </motion.div>
    </Link>
  )
}