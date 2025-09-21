'use client'

import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Users, DollarSign } from "lucide-react"

interface GameCardProps {
  gameName: string
  date: string
  time: string
  price: number
  location: string
  attendees: number
  maxAttendees: number
  groupName: string
}

export function GameCard({
  gameName,
  date,
  time,
  price,
  location,
  attendees,
  maxAttendees,
  groupName
}: GameCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const isFullyBooked = attendees >= maxAttendees
  const spotsLeft = maxAttendees - attendees

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Game Image Placeholder */}
      <div className="h-48 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <span className="text-6xl text-white opacity-80">⚽</span>
      </div>

      <div className="p-6">
        {/* Group Name */}
        <div className="text-sm text-gray-500 mb-2">{groupName}</div>
        
        {/* Game Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-3">{gameName}</h3>

        {/* Game Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{formatDate(date)}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>{time}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="truncate">{location}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>{attendees}/{maxAttendees} players</span>
            {!isFullyBooked && (
              <span className="ml-2 text-sm text-green-600">
                ({spotsLeft} spots left)
              </span>
            )}
          </div>
          
          <div className="flex items-center text-gray-600">
            <DollarSign className="w-4 h-4 mr-2" />
            <span className="font-semibold">${price}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            size="sm"
          >
            View Details
          </Button>
          <Button 
            className={`flex-1 ${
              isFullyBooked 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            size="sm"
            disabled={isFullyBooked}
          >
            {isFullyBooked ? 'Fully Booked' : 'Buy Game'}
          </Button>
        </div>
      </div>
    </div>
  )
}
