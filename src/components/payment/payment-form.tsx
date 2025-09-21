&apos;use client&apos;

import { useState, useEffect } from &apos;react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { useAuth } from &apos;@/contexts/auth-context&apos;
import { AuthModal } from &apos;@/components/auth/auth-modal&apos;
import { supabase } from &apos;@/lib/supabase&apos;
import { getStripe } from &apos;@/lib/stripe&apos;

interface Game {
  id: string
  name: string
  price: number
  location: string
  game_date: string
  game_time: string
  groups: {
    name: string
  }
}

interface PaymentFormProps {
  game: Game
  onSuccess?: () => void
  onCancel?: () => void
}

export function PaymentForm({ game, onCancel }: PaymentFormProps) {
  const { user, player } = useAuth()
  const [formData, setFormData] = useState({
    name: &apos;&apos;,
    email: &apos;&apos;,
    phone: &apos;&apos;,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    // Pre-fill form data if user is logged in
    if (user && player) {
      setFormData({
        name: player.name || &apos;&apos;,
        email: player.email || &apos;&apos;,
        phone: player.phone || &apos;&apos;,
      })
    }
  }, [user, player])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!supabase) {
        throw new Error(&apos;Supabase client not initialized&apos;)
      }

      // Create checkout session
      const response = await fetch(&apos;/api/create-checkout-session&apos;, {
        method: &apos;POST&apos;,
        headers: {
          &apos;Content-Type&apos;: &apos;application/json&apos;,
        },
        body: JSON.stringify({
          gameId: game.id,
          gameName: game.name,
          price: game.price,
          customerEmail: formData.email,
          customerName: formData.name,
          customerPhone: formData.phone,
        }),
      })

      if (!response.ok) {
        throw new Error(&apos;Failed to create checkout session&apos;)
      }

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await getStripe()
      if (!stripe) {
        throw new Error(&apos;Stripe not initialized&apos;)
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        throw stripeError
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : &apos;An error occurred&apos;)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Purchase Game Ticket
        </h2>

        {/* Sign In Option for Non-Authenticated Users */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">Have an account?</h3>
                <p className="text-blue-700 text-sm">Sign in to auto-fill your details</p>
              </div>
              <Button
                onClick={() => setShowAuthModal(true)}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Sign In
              </Button>
            </div>
          </div>
        )}

        {/* User Info for Authenticated Users */}
        {user && player && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 font-semibold">
                    {player.name?.charAt(0).toUpperCase() || &apos;U&apos;}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Welcome back, {player.name}!</h3>
                  <p className="text-green-700 text-sm">Your details are pre-filled below</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  // Clear form data and sign out
                  setFormData({ name: &apos;&apos;, email: &apos;&apos;, phone: &apos;&apos; })
                  // You could add a sign out function here if needed
                }}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Use Different Account
              </Button>
            </div>
          </div>
        )}

        {/* Game Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{game.name}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Group:</strong> {game.groups.name}</p>
            <p><strong>Date:</strong> {new Date(game.game_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> {game.game_time}</p>
            <p><strong>Location:</strong> {game.location}</p>
            <p><strong>Price:</strong> <span className="text-green-600 font-semibold">${game.price}</span></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange(&apos;name&apos;, e.target.value)}
              required
              readOnly={!!user}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                user ? &apos;bg-gray-50 cursor-not-allowed&apos; : &apos;&apos;
              }`}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange(&apos;email&apos;, e.target.value)}
              required
              readOnly={!!user}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                user ? &apos;bg-gray-50 cursor-not-allowed&apos; : &apos;&apos;
              }`}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange(&apos;phone&apos;, e.target.value)}
              required
              readOnly={!!user}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                user ? &apos;bg-gray-50 cursor-not-allowed&apos; : &apos;&apos;
              }`}
              placeholder="Enter your phone number"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? &apos;Processing...&apos; : `Pay $${game.price}`}
            </Button>
          </div>
        </form>

        {!user && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Don&apos;t have an account?</strong> No problem! You can purchase this game as a guest. 
              After payment, you&apos;ll have the option to create an account to track your game history.
            </p>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          // The useEffect will automatically update the form when user signs in
        }}
      />
    </div>
  )
}
