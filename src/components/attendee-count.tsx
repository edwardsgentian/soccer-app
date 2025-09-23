'use client'

import { Users } from 'lucide-react'

interface AttendeeCountProps {
  currentCount: number
  maxCount: number
  showSpotsLeft?: boolean
  className?: string
}

export function AttendeeCount({ 
  currentCount, 
  maxCount, 
  showSpotsLeft = true,
  className = ""
}: AttendeeCountProps) {
  const spotsLeft = maxCount - currentCount
  const isFullyBooked = currentCount >= maxCount

  return (
    <div className={`flex items-center text-gray-500 ${className}`}>
      <Users className="w-4 h-4 mr-3" />
      <span className="font-medium">{currentCount}/{maxCount} players</span>
      {showSpotsLeft && !isFullyBooked && (
        <span className="ml-2 text-sm text-gray-400">
          ({spotsLeft} spots left)
        </span>
      )}
    </div>
  )
}
