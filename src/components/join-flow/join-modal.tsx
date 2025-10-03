'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Eye, EyeOff, Calendar, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal'
import Image from 'next/image'

interface JoinModalProps {
  isOpen: boolean
  onClose: () => void
  gameId?: string
  seasonId?: string
  price: number
  gameName?: string
  seasonName?: string
  gameDate?: string
  gameTime?: string
  location?: string
  availableSpots?: number
  totalSpots?: number
  discountCode?: string
  discountedPrice?: number
  type?: 'game' | 'season'
  groupName?: string
}

export function JoinModal({ 
  isOpen, 
  onClose, 
  gameId, 
  seasonId, 
  price, 
  gameName, 
  seasonName,
  gameDate,
  gameTime,
  location,
  availableSpots,
  totalSpots,
  discountCode,
  discountedPrice,
  groupName
}: JoinModalProps) {
  const { player, login, signup } = useAuth()
  const [step, setStep] = useState<'login' | 'signup' | 'checkout'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })
  
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [countryCode, setCountryCode] = useState('+1')
  const [phoneNumber, setPhoneNumber] = useState('')

  // Check if user is already logged in
  useEffect(() => {
    if (isOpen && player) {
      setStep('checkout')
    } else if (isOpen && !player) {
      setStep('login')
    }
  }, [isOpen, player])

  // Phone number validation
  const validatePhoneNumber = (phone: string) => {
    // International phone number regex (supports country codes)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  // Calculate final price
  const finalPrice = Math.max(0, (discountedPrice || price) - promoDiscount)

  const handlePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoDiscount(0)
      return
    }

    try {
      // Call the proper API to validate promo code for this specific game/season
      const response = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoCode,
          gameId: gameId || null,
          seasonId: seasonId || null,
          originalPrice: price
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPromoDiscount(result.discount.amount)
        setError(null)
      } else {
        setPromoDiscount(0)
        setError(result.error || 'Invalid promo code')
      }
    } catch {
      setPromoDiscount(0)
      setError('Error validating promo code')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(loginForm.email, loginForm.password)
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', loginForm.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      
      // Small delay to ensure authentication state is updated
      setTimeout(() => {
        setStep('checkout')
      }, 100)
    } catch {
      setError('Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const fullPhoneNumber = countryCode + phoneNumber
    if (!validatePhoneNumber(fullPhoneNumber)) {
      setError('Please enter a valid phone number')
      setLoading(false)
      return
    }

    try {
      await signup(
        signupForm.name,
        signupForm.email,
        fullPhoneNumber,
        signupForm.password
      )
      
      // Small delay to ensure authentication state is updated
      setTimeout(() => {
        setStep('checkout')
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    // Ensure player data is available
    if (!player) {
      setError('Please complete your account setup first')
      setLoading(false)
      return
    }

    try {
      console.log('Creating checkout session for player:', player.id, player.email)
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          seasonId,
          price: finalPrice,
          playerName: player.name,
          playerEmail: player.email,
          playerPhone: player.phone,
          playerId: player.id,
          discountCode,
          groupName,
        }),
      })

      const { sessionId, error: sessionError } = await response.json()

      if (sessionError) {
        throw new Error(sessionError)
      }

      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js').then(({ loadStripe }) => 
        loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      )

      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) {
          throw new Error(error.message)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-white">
      {/* Logo - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
          <Image 
            src="/face.png" 
            alt="Logo" 
            width={32}
            height={32}
            className="w-8 h-8"
          />
        </div>
      </div>

      {/* Close Button - Top Right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
      >
        <X className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex flex-col lg:flex-row gap-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto mt-16 lg:mt-0">
        {/* Right Column - Order Summary (Mobile: First, Desktop: Second) */}
        <div className="w-full lg:w-96 bg-white rounded-lg p-6 lg:p-8 h-fit order-1 lg:order-2">
          <div>
            {/* Event Details */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 text-lg mb-2">
              {gameName || seasonName}
            </h3>
              {groupName && (
                <p className="text-sm text-gray-600 mb-4">
                  {groupName}
                </p>
              )}
              
              {/* Event Info */}
              <div className="space-y-3">
                {gameDate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(gameDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                )}
                
                {gameTime && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(`2000-01-01T${gameTime}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}</span>
                  </div>
                )}
                
                {location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{location}</span>
                  </div>
                )}
                
                {availableSpots !== undefined && totalSpots !== undefined && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span>{availableSpots} of {totalSpots} spots available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {gameId ? 'Game fee' : 'Season pass'}
                  </span>
                  <span className="text-gray-900">
                    {discountCode && discountedPrice ? (
                      <>
                        <span className="line-through text-gray-400">${price}</span>
                        <span className="ml-2">${discountedPrice}</span>
                      </>
                    ) : (
                      `$${price}`
                    )}
                  </span>
                </div>
                
                {discountCode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount ({discountCode})</span>
                    <span className="text-green-600">-${price - (discountedPrice || price)}</span>
                  </div>
                )}
                
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Promo Code ({promoCode})</span>
                    <span className="text-green-600">-${promoDiscount}</span>
                </div>
              )}
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-semibold text-gray-900">${finalPrice}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Column - Your Info & Payment (Mobile: Second, Desktop: First) */}
        <div className="flex-1 bg-white rounded-lg p-6 lg:p-8 order-2 lg:order-1">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-medium text-gray-900 font-serif">
              {step === 'login' && 'Sign In'}
              {step === 'signup' && 'Create Account'}
              {step === 'checkout' && 'Complete Purchase'}
            </h2>
          </div>

          {/* Content */}
          <div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Your Info Section */}
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                </label>
                  <input
                    type="email"
                    required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                      placeholder="you@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  />
              </div>

              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                        className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-black hover:bg-gray-800 text-white py-3 text-lg font-medium" 
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    className="text-black hover:text-gray-700 font-bold"
                    onClick={() => setStep('signup')}
                  >
                    Sign up
                  </button>
                </p>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-black hover:text-gray-700 font-bold"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          )}

          {/* Signup Form */}
          {step === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Your Info Section */}
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                </label>
                  <input
                    type="text"
                    required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                      placeholder="Your Name"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  />
              </div>

              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                </label>
                  <input
                    type="email"
                    required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                      placeholder="you@email.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  />
              </div>

              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                </label>
                    <div className="flex space-x-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                      >
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+33">🇫🇷 +33</option>
                        <option value="+49">🇩🇪 +49</option>
                        <option value="+39">🇮🇹 +39</option>
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+31">🇳🇱 +31</option>
                        <option value="+46">🇸🇪 +46</option>
                        <option value="+47">🇳🇴 +47</option>
                        <option value="+45">🇩🇰 +45</option>
                        <option value="+41">🇨🇭 +41</option>
                        <option value="+43">🇦🇹 +43</option>
                        <option value="+32">🇧🇪 +32</option>
                        <option value="+351">🇵🇹 +351</option>
                        <option value="+353">🇮🇪 +353</option>
                        <option value="+358">🇫🇮 +358</option>
                        <option value="+30">🇬🇷 +30</option>
                        <option value="+48">🇵🇱 +48</option>
                        <option value="+420">🇨🇿 +420</option>
                        <option value="+421">🇸🇰 +421</option>
                        <option value="+36">🇭🇺 +36</option>
                        <option value="+40">🇷🇴 +40</option>
                        <option value="+359">🇧🇬 +359</option>
                        <option value="+385">🇭🇷 +385</option>
                        <option value="+386">🇸🇮 +386</option>
                        <option value="+372">🇪🇪 +372</option>
                        <option value="+371">🇱🇻 +371</option>
                        <option value="+370">🇱🇹 +370</option>
                        <option value="+7">🇷🇺 +7</option>
                        <option value="+380">🇺🇦 +380</option>
                        <option value="+375">🇧🇾 +375</option>
                        <option value="+370">🇱🇹 +370</option>
                        <option value="+371">🇱🇻 +371</option>
                        <option value="+372">🇪🇪 +372</option>
                        <option value="+81">🇯🇵 +81</option>
                        <option value="+82">🇰🇷 +82</option>
                        <option value="+86">🇨🇳 +86</option>
                        <option value="+852">🇭🇰 +852</option>
                        <option value="+853">🇲🇴 +853</option>
                        <option value="+886">🇹🇼 +886</option>
                        <option value="+65">🇸🇬 +65</option>
                        <option value="+60">🇲🇾 +60</option>
                        <option value="+66">🇹🇭 +66</option>
                        <option value="+84">🇻🇳 +84</option>
                        <option value="+63">🇵🇭 +63</option>
                        <option value="+62">🇮🇩 +62</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+92">🇵🇰 +92</option>
                        <option value="+880">🇧🇩 +880</option>
                        <option value="+94">🇱🇰 +94</option>
                        <option value="+977">🇳🇵 +977</option>
                        <option value="+975">🇧🇹 +975</option>
                        <option value="+960">🇲🇻 +960</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+64">🇳🇿 +64</option>
                        <option value="+27">🇿🇦 +27</option>
                        <option value="+20">🇪🇬 +20</option>
                        <option value="+212">🇲🇦 +212</option>
                        <option value="+213">🇩🇿 +213</option>
                        <option value="+216">🇹🇳 +216</option>
                        <option value="+218">🇱🇾 +218</option>
                        <option value="+220">🇬🇲 +220</option>
                        <option value="+221">🇸🇳 +221</option>
                        <option value="+222">🇲🇷 +222</option>
                        <option value="+223">🇲🇱 +223</option>
                        <option value="+224">🇬🇳 +224</option>
                        <option value="+225">🇨🇮 +225</option>
                        <option value="+226">🇧🇫 +226</option>
                        <option value="+227">🇳🇪 +227</option>
                        <option value="+228">🇹🇬 +228</option>
                        <option value="+229">🇧🇯 +229</option>
                        <option value="+230">🇲🇺 +230</option>
                        <option value="+231">🇱🇷 +231</option>
                        <option value="+232">🇸🇱 +232</option>
                        <option value="+233">🇬🇭 +233</option>
                        <option value="+234">🇳🇬 +234</option>
                        <option value="+235">🇹🇩 +235</option>
                        <option value="+236">🇨🇫 +236</option>
                        <option value="+237">🇨🇲 +237</option>
                        <option value="+238">🇨🇻 +238</option>
                        <option value="+239">🇸🇹 +239</option>
                        <option value="+240">🇬🇶 +240</option>
                        <option value="+241">🇬🇦 +241</option>
                        <option value="+242">🇨🇬 +242</option>
                        <option value="+243">🇨🇩 +243</option>
                        <option value="+244">🇦🇴 +244</option>
                        <option value="+245">🇬🇼 +245</option>
                        <option value="+246">🇮🇴 +246</option>
                        <option value="+248">🇸🇨 +248</option>
                        <option value="+249">🇸🇩 +249</option>
                        <option value="+250">🇷🇼 +250</option>
                        <option value="+251">🇪🇹 +251</option>
                        <option value="+252">🇸🇴 +252</option>
                        <option value="+253">🇩🇯 +253</option>
                        <option value="+254">🇰🇪 +254</option>
                        <option value="+255">🇹🇿 +255</option>
                        <option value="+256">🇺🇬 +256</option>
                        <option value="+257">🇧🇮 +257</option>
                        <option value="+258">🇲🇿 +258</option>
                        <option value="+260">🇿🇲 +260</option>
                        <option value="+261">🇲🇬 +261</option>
                        <option value="+262">🇷🇪 +262</option>
                        <option value="+263">🇿🇼 +263</option>
                        <option value="+264">🇳🇦 +264</option>
                        <option value="+265">🇲🇼 +265</option>
                        <option value="+266">🇱🇸 +266</option>
                        <option value="+267">🇧🇼 +267</option>
                        <option value="+268">🇸🇿 +268</option>
                        <option value="+269">🇰🇲 +269</option>
                        <option value="+290">🇸🇭 +290</option>
                        <option value="+291">🇪🇷 +291</option>
                        <option value="+297">🇦🇼 +297</option>
                        <option value="+298">🇫🇴 +298</option>
                        <option value="+299">🇬🇱 +299</option>
                        <option value="+350">🇬🇮 +350</option>
                        <option value="+500">🇫🇰 +500</option>
                        <option value="+501">🇧🇿 +501</option>
                        <option value="+502">🇬🇹 +502</option>
                        <option value="+503">🇸🇻 +503</option>
                        <option value="+504">🇭🇳 +504</option>
                        <option value="+505">🇳🇮 +505</option>
                        <option value="+506">🇨🇷 +506</option>
                        <option value="+507">🇵🇦 +507</option>
                        <option value="+508">🇵🇲 +508</option>
                        <option value="+509">🇭🇹 +509</option>
                        <option value="+590">🇬🇵 +590</option>
                        <option value="+591">🇧🇴 +591</option>
                        <option value="+592">🇬🇾 +592</option>
                        <option value="+593">🇪🇨 +593</option>
                        <option value="+594">🇬🇫 +594</option>
                        <option value="+595">🇵🇾 +595</option>
                        <option value="+596">🇲🇶 +596</option>
                        <option value="+597">🇸🇷 +597</option>
                        <option value="+598">🇺🇾 +598</option>
                        <option value="+599">🇧🇶 +599</option>
                        <option value="+670">🇹🇱 +670</option>
                        <option value="+672">🇦🇶 +672</option>
                        <option value="+673">🇧🇳 +673</option>
                        <option value="+674">🇳🇷 +674</option>
                        <option value="+675">🇵🇬 +675</option>
                        <option value="+676">🇹🇴 +676</option>
                        <option value="+677">🇸🇧 +677</option>
                        <option value="+678">🇻🇺 +678</option>
                        <option value="+679">🇫🇯 +679</option>
                        <option value="+680">🇵🇼 +680</option>
                        <option value="+681">🇼🇫 +681</option>
                        <option value="+682">🇨🇰 +682</option>
                        <option value="+683">🇳🇺 +683</option>
                        <option value="+684">🇦🇸 +684</option>
                        <option value="+685">🇼🇸 +685</option>
                        <option value="+686">🇰🇮 +686</option>
                        <option value="+687">🇳🇨 +687</option>
                        <option value="+688">🇹🇻 +688</option>
                        <option value="+689">🇵🇫 +689</option>
                        <option value="+690">🇹🇰 +690</option>
                        <option value="+691">🇫🇲 +691</option>
                        <option value="+692">🇲🇭 +692</option>
                        <option value="+850">🇰🇵 +850</option>
                        <option value="+852">🇭🇰 +852</option>
                        <option value="+853">🇲🇴 +853</option>
                        <option value="+855">🇰🇭 +855</option>
                        <option value="+856">🇱🇦 +856</option>
                        <option value="+880">🇧🇩 +880</option>
                        <option value="+886">🇹🇼 +886</option>
                        <option value="+960">🇲🇻 +960</option>
                        <option value="+961">🇱🇧 +961</option>
                        <option value="+962">🇯🇴 +962</option>
                        <option value="+963">🇸🇾 +963</option>
                        <option value="+964">🇮🇶 +964</option>
                        <option value="+965">🇰🇼 +965</option>
                        <option value="+966">🇸🇦 +966</option>
                        <option value="+967">🇾🇪 +967</option>
                        <option value="+968">🇴🇲 +968</option>
                        <option value="+970">🇵🇸 +970</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+972">🇮🇱 +972</option>
                        <option value="+973">🇧🇭 +973</option>
                        <option value="+974">🇶🇦 +974</option>
                        <option value="+975">🇧🇹 +975</option>
                        <option value="+976">🇲🇳 +976</option>
                        <option value="+977">🇳🇵 +977</option>
                        <option value="+992">🇹🇯 +992</option>
                        <option value="+993">🇹🇲 +993</option>
                        <option value="+994">🇦🇿 +994</option>
                        <option value="+995">🇬🇪 +995</option>
                        <option value="+996">🇰🇬 +996</option>
                        <option value="+998">🇺🇿 +998</option>
                      </select>
                  <input
                    type="tel"
                    required
                        className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                        placeholder="1234567890"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                        className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                    placeholder="Create a password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                </label>
                  <input
                      type="password"
                    required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                    placeholder="Confirm your password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                  />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-black hover:bg-gray-800 text-white py-3 text-lg font-medium" 
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="text-black hover:text-gray-700 font-bold"
                    onClick={() => setStep('login')}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Checkout Step */}
          {step === 'checkout' && (
            <div className="space-y-6">
              {/* Your Info Section */}
              <div>
                <div className="flex items-center space-x-4 mb-6">
                  {/* Profile Avatar */}
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    {player?.photo_url ? (
                      <Image 
                        src={player.photo_url} 
                        alt={player.name || 'Profile'} 
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl text-gray-600 font-bold">
                        {player?.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{player?.name}</h4>
                      <button 
                        type="button"
                        className="text-sm text-gray-600 hover:text-gray-800 underline"
                        onClick={() => setStep('login')}
                      >
                        Change
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{player?.email}</p>
                    <p className="text-sm text-gray-600">{player?.phone}</p>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Promo Code
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                      />
                <button
                  type="button"
                        onClick={handlePromoCode}
                        className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                        Apply
                </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit or Debit Card *
                    </label>
                    <div className="w-full bg-blue-100 text-blue-800 text-sm px-3 py-2 rounded-full text-center">
                      <p>Secure payment processing powered by Stripe</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full bg-black hover:bg-gray-800 text-white py-3 text-lg font-medium" 
                disabled={loading}
              >
                {loading ? 'Processing...' : `Pay with Card`}
              </Button>
            </div>
          )}
        </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onBackToLogin={() => setShowForgotPassword(false)}
      />
    </div>
  )
}
