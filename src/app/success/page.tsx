import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Simple header without complex components */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Soccer App
            </Link>
          </div>
        </div>
      </nav>
      
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
                  <div className="w-5 h-5 mr-3 text-green-600">📅</div>
                  <span>Game registration confirmed</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-5 h-5 mr-3 text-green-600">📍</div>
                  <span>Check your email for location details</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-5 h-5 mr-3 text-green-600">👥</div>
                  <span>You&apos;re now part of the team!</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Link
                href="/games"
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
              >
                View All Games
              </Link>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Create an Account</h3>
                <p className="text-blue-700 text-sm mb-4">
                  Track your game history and get faster checkout for future games.
                </p>
                <Link
                  href="/profile"
                  className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-block"
                >
                  Create Account
                </Link>
              </div>
              
              <Link
                href="/"
                className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-block"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

