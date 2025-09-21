&apos;use client&apos;

import { useSearchParams } from &apos;next/navigation&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Header } from &apos;@/components/header&apos;

export default function CancelPage() {
  const searchParams = useSearchParams()
  const gameId = searchParams.get(&apos;game_id&apos;)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Payment Cancelled
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your payment was cancelled. No charges have been made to your account.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">What&apos;s Next?</h2>
              <p className="text-yellow-700 text-sm">
                You can try again anytime. The game spot is still available for you to book.
              </p>
            </div>

            <div className="space-y-4">
              {gameId && (
                <Button
                  onClick={() => window.location.href = `/games/${gameId}`}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  Try Again
                </Button>
              )}
              
              <Button
                onClick={() => window.location.href = &apos;/games&apos;}
                variant="outline"
                className="w-full"
              >
                Browse All Games
              </Button>
              
              <Button
                onClick={() => window.location.href = &apos;/&apos;}
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
