'use client'

import { useState } from 'react'
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
  const [isHovered, setIsHovered] = useState(false)

  // Generate random gradient based on gameId for consistency
  const getRandomGradient = () => {
    const gradients = [
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-red-400 to-red-600',
      'from-yellow-400 to-yellow-600',
      'from-indigo-400 to-indigo-600',
      'from-teal-400 to-teal-600',
      'from-orange-400 to-orange-600',
      'from-cyan-400 to-cyan-600',
      'from-emerald-400 to-emerald-600',
      'from-violet-400 to-violet-600'
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
    
    for (let i = 0; i < avatarCount; i++) {
      avatars.push(
        <div
          key={i}
          className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-600"
          style={{ marginLeft: i > 0 ? '-8px' : '0' }}
        >
          {String.fromCharCode(65 + i)}
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
        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex">
          {/* Image Section */}
          <div className={`w-24 h-24 bg-gradient-to-br ${getRandomGradient()} rounded-lg ml-4 mt-4 flex items-center justify-center relative`}>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⚽</span>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 pt-4">
            {/* Availability Section */}
            <div className="flex items-center mb-3">
              <div className="flex items-center mr-2">
                {generateAvatarStack()}
              </div>
              <span className="text-sm text-gray-600">
                {isPastGame ? `${attendees} attended` : `${availableSpots} spots available`}
              </span>
            </div>

            {/* Group Name */}
            <div className="text-sm text-gray-500 mb-3">{groupName}</div>

            {/* Game Name */}
            <h3 className="font-semibold text-gray-900 mb-2">{gameName}</h3>

            {/* Game Details */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center text-gray-600 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>{time}</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{location}</span>
              </div>
            </div>

            {/* Price or Completed Badge */}
            <div className="flex items-center justify-between">
              {isPastGame ? (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  Completed
                </span>
              ) : (
                <span className="text-lg font-bold text-gray-900">${price}</span>
              )}
              
              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}