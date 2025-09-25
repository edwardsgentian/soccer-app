'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { Calendar, MapPin, Users } from 'lucide-react'

export default function SuccessPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-lg font-semibold text-green-800 mb-4">Game Details</h2>
              <div className="space-y-3">
                <div className="flex items-center text-gray-700">
                  <Calendar className="w-5 h-5 mr-3 text-green-600" />
                  <span>Game registration confirmed</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-5 h-5 mr-3 text-green-600" />
                  <span>Check your email for location details</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="w-5 h-5 mr-3 text-green-600" />
                  <span>You&apos;re now part of the team!</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => window.location.href = '/games'}
                className="w-full"
                size="lg"
              >
                View All Games
              </Button>
              
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

