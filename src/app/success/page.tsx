'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { SeasonGameSelectionModal } from '@/components/season-game-selection-modal'

function SuccessPageContent() {
  const { player, user, restoreAuth } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentProcessed, setPaymentProcessed] = useState(false)
  const [showSeasonGameSelection, setShowSeasonGameSelection] = useState(false)
  const [purchasedSeasonId, setPurchasedSeasonId] = useState<string | null>(null)

  useEffect(() => {
    console.log('Success page - User state:', { user: !!user, player: !!player })
    
    // Try to restore authentication if not already authenticated
    if (!user && !player) {
      restoreAuth().then((restored) => {
        if (restored) {
          console.log('Authentication restored on success page')
        }
      })
    }
  }, [user, player, restoreAuth])

  // Separate useEffect for payment processing to prevent multiple calls
  useEffect(() => {
    if (sessionId && !paymentProcessed) {
      setPaymentProcessed(true)
      processPayment(sessionId)
    } else if (!sessionId) {
      setError('No session ID found')
      setLoading(false)
    }
  }, [sessionId, paymentProcessed])

  const processPayment = async (sessionId: string) => {
    try {
      console.log('Processing payment for session:', sessionId)
      
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      console.log('Payment API response status:', response.status)
      
      const data = await response.json()
      console.log('Payment API response data:', JSON.stringify(data, null, 2))

      if (data.success) {
        // Check if this was a season purchase
        if (data.seasonId) {
          setPurchasedSeasonId(data.seasonId)
          setShowSeasonGameSelection(true)
        }
        setLoading(false)
      } else {
        setError(data.error || 'Payment processing failed')
        setLoading(false)
      }
    } catch (err) {
      console.error('Payment processing error:', err)
      setError('Failed to process payment')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Processing your payment...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/games">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Games
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="mb-6">
            <Image 
              src="/success.jpeg" 
              alt="Success" 
              width={120} 
              height={120} 
              className="w-30 h-30 mx-auto rounded-lg object-cover"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">You're in!</h1>
          <p className="text-gray-600 mb-8">
            You&apos;re all set! You&apos;ll receive a confirmation email shortly.
          </p>
          <div>
            <Link href="/profile">
              <Button>
                View My Games
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Season Game Selection Modal */}
      {showSeasonGameSelection && purchasedSeasonId && player && (
        <SeasonGameSelectionModal
          isOpen={showSeasonGameSelection}
          onClose={() => setShowSeasonGameSelection(false)}
          seasonId={purchasedSeasonId}
          playerId={player.id}
          onSuccess={() => {
            console.log('Season game selection completed')
          }}
        />
      )}
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
}
