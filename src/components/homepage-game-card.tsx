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
  gameId?: string
  tags?: string[]
}

export function HomepageGameCard({
  gameName,
  time,
  price,
  location,
  attendees,
  maxAttendees,
  groupName,
  gameId = 'sample-game-id',
  tags = []
}: HomepageGameCardProps) {
  
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Generate a consistent random gradient based on gameId
  const getRandomGradient = (id: string) => {
    const gradients = [
      'from-purple-200 to-pink-200', // Original
      'from-blue-200 to-cyan-200',   // Blue theme
      'from-green-200 to-emerald-200', // Green theme
      'from-orange-200 to-red-200',  // Orange/Red theme
      'from-yellow-200 to-orange-200', // Yellow theme
      'from-pink-200 to-purple-200', // Pink theme
      'from-indigo-200 to-blue-200', // Indigo theme
      'from-teal-200 to-green-200',  // Teal theme
      'from-rose-200 to-pink-200',   // Rose theme
      'from-violet-200 to-purple-200', // Violet theme
      'from-amber-200 to-yellow-200', // Amber theme
      'from-emerald-200 to-teal-200'  // Emerald theme
    ]
    
    // Use gameId to get a consistent "random" selection
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return gradients[Math.abs(hash) % gradients.length]
  }

  const gradientClass = getRandomGradient(gameId)
  const spotsLeft = maxAttendees - attendees

  // Generate avatar stack
  const generateAvatarStack = () => {
    const maxAvatars = 3
    const avatarCount = Math.min(attendees, maxAvatars)
    const avatars = []
    
    // Generate random colors for avatars
    const avatarColors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500',
      'bg-red-500', 'bg-teal-500', 'bg-orange-500'
    ]
    
    for (let i = 0; i < avatarCount; i++) {
      const color = avatarColors[i % avatarColors.length]
      const initials = String.fromCharCode(65 + (i % 26)) // A, B, C, etc.
      
      avatars.push(
        <div
          key={i}
          className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-white text-xs font-medium border-2 border-white -ml-1 first:ml-0`}
          style={{ zIndex: maxAvatars - i }}
        >
          {initials}
        </div>
      )
    }
    
    // Add overflow indicator if there are more attendees than shown
    if (attendees > maxAvatars) {
      avatars.push(
        <div
          key="overflow"
          className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium border-2 border-white -ml-1"
          style={{ zIndex: 0 }}
        >
          +{attendees - maxAvatars}
        </div>
      )
    }
    
    return avatars
  }

  return (
    <>
      <Link href={`/games/${gameId}`} className="block">
        <motion.div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          whileHover={{ 
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
        >
        <div className="flex">
          {/* Left Section - Logo/Image */}
          <div className={`w-24 h-24 bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0 ml-4 mt-4 rounded-lg`}>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
              <span className="text-gray-600 font-bold text-lg">⚽</span>
            </div>
          </div>

          {/* Right Section - Content */}
          <div className="flex-1 p-4 pt-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-lg">{gameName}</h3>
              {price > 0 ? (
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm font-medium">
                  ${price}
                </div>
              ) : (
                <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-sm font-medium">
                  Completed
                </div>
              )}
            </div>

            <div className="space-y-1 mb-3">
              <div className="flex items-center text-gray-600 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>{formatTime(time)}</span>
              </div>
              
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="truncate">{location}</span>
              </div>
            </div>

            {/* Availability */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center">
                {generateAvatarStack()}
              </div>
              <span className="text-gray-600 text-sm">
                {price > 0 ? `${spotsLeft} spots available` : `${attendees} attended`}
              </span>
            </div>

            <div className="mb-3">
              <div className="font-bold text-gray-900 text-sm">{groupName}</div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        </motion.div>
      </Link>
    </>
  )
}
