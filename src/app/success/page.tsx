'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { useAuth } from '@/contexts/auth-context'
import { Calendar, MapPin, Users } from 'lucide-react'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [gameDetails, setGameDetails] = useState<any>(null)

  useEffect(() => {
    // Simulate processing time
    setTimeout(() => {
      setGameDetails({
        name: 'Central Park Pickup',
        date: '2024-01-25',
        time: '18:00',
        location: 'Central Park, NYC',
        group: 'NYC Women&apos;s Soccer'
      })
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Processing your payment...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Congratulations! You&apos;re now registered for the game.
            </p>

            {gameDetails && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
                <h2 className="text-lg font-semibold text-green-800 mb-4">Game Details</h2>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <Calendar className="w-5 h-5 mr-3 text-green-600" />
                    <span>{new Date(gameDetails.date).toLocaleDateString()} at {gameDetails.time}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-5 h-5 mr-3 text-green-600" />
                    <span>{gameDetails.location}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Users className="w-5 h-5 mr-3 text-green-600" />
                    <span>{gameDetails.group}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={() => window.location.href = '/games'}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                View All Games
              </Button>
              
              {!user && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Create an Account</h3>
                  <p className="text-blue-700 text-sm mb-4">
                    Track your game history and get faster checkout for future games.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/profile'}
                    variant="outline"
                    className="w-full"
                  >
                    Create Account
                  </Button>
                </div>
              )}
              
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
