'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { PaymentModal } from "@/components/payment/payment-modal"
import { Calendar, Clock, MapPin, Users, DollarSign, Ticket } from "lucide-react"

interface GameCardProps {
  gameName: string
  date: string
  time: string
  price: number
  location: string
  attendees: number
  maxAttendees: number
  groupName: string
  gameId?: string
  organizer?: {
    id: string
    name: string
    photo_url?: string
  }
}

export function GameCard({
  gameName,
  date,
  time,
  price,
  location,
  attendees,
  maxAttendees,
  groupName,
  gameId = 'sample-game-id'
}: GameCardProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
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

  const game = {
    id: gameId,
    name: gameName,
    price,
    location,
    game_date: date,
    game_time: time,
    groups: {
      name: groupName
    }
  }

  const handlePaymentSuccess = () => {
    // Refresh the page or update the attendees count
    window.location.reload()
  }

  return (
    <>
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Game Image Placeholder */}
      <div className="h-32 bg-gray-50 flex items-center justify-center">
        <Ticket className="w-8 h-8 text-gray-400" />
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
              <span className="ml-2 text-sm text-blue-600">
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
            asChild
            variant="outline" 
            className="flex-1"
            size="sm"
          >
            <Link href={`/games/${gameId}`}>
              View Details
            </Link>
          </Button>
          <Button 
            className={`flex-1 ${
              isFullyBooked 
                ? 'bg-gray-400 cursor-not-allowed' 
                : ''
            }`}
            size="sm"
            disabled={isFullyBooked}
            onClick={() => setShowPaymentModal(true)}
          >
            {isFullyBooked ? 'Fully Booked' : 'Buy Game'}
          </Button>
        </div>
      </div>
    </div>

    <PaymentModal
      isOpen={showPaymentModal}
      onClose={() => setShowPaymentModal(false)}
      game={game}
      onSuccess={handlePaymentSuccess}
    />
    </>
  )
}
