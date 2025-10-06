'use client'

import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Ticket, MapPin, Clock8, List, BadgePlus, ClipboardCheck } from 'lucide-react'
import Image from 'next/image'

// Google Maps API types
interface GoogleMapsWindow extends Window {
  google?: {
    maps: {
      places: {
        AutocompleteService: new () => {
          getPlacePredictions: (request: {
            input: string
            types?: string[]
            componentRestrictions?: { country: string }
          }, callback: (predictions: Array<{ description: string }> | null, status: string) => void) => void
        }
        PlacesServiceStatus: {
          OK: string
        }
      }
    }
  }
}

type StepId = 'about' | 'location' | 'schedule' | 'pricing' | 'options' | 'review'

interface WizardProps {
  onCancel: () => void
  onComplete: (data: Record<string, unknown>) => void
  loading?: boolean
}

export function CreateGameWizard({ onCancel, onComplete, loading = false }: WizardProps) {
  const steps: { id: StepId; label: string; sub?: string; icon: React.ComponentType<{ className?: string }> }[] = useMemo(
    () => [
      { id: 'about', label: 'Your Game', sub: undefined, icon: Ticket },
      { id: 'location', label: 'Location', icon: MapPin },
      { id: 'schedule', label: 'Schedule', icon: Clock8 },
      { id: 'pricing', label: 'Pricing', icon: List },
      { id: 'options', label: 'Options', icon: BadgePlus },
      { id: 'review', label: 'Review', icon: ClipboardCheck },
    ],
    []
  )

  const [stepIdx, setStepIdx] = useState(0)
  const step = steps[stepIdx]

  const next = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1))
  const back = () => setStepIdx((i) => Math.max(i - 1, 0))

  // Handle custom game date updates
  const updateCustomGameDate = (index: number, field: 'date' | 'time', value: string) => {
    setCustomGameDates(prev => prev.map((game, i) => 
      i === index ? { ...game, [field]: value } : game
    ))
  }

  // Basic form state used to render content
  const [type, setType] = useState<'one-off' | 'season'>('one-off')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [firstDate, setFirstDate] = useState('')
  const [firstTime, setFirstTime] = useState('')
  const [totalGames, setTotalGames] = useState('6')
  const [price, setPrice] = useState('')
  const [spots, setSpots] = useState('')
  const [seasonPrice, setSeasonPrice] = useState('')
  const [gamePrice, setGamePrice] = useState('')
  const [gameSpots, setGameSpots] = useState('')
  const [seasonSpots, setSeasonSpots] = useState('')
  const [allowIndividual, setAllowIndividual] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  
  // Missing fields from original form
  const [description, setDescription] = useState('')
  const [durationHours, setDurationHours] = useState('2.0')
  const [repeatType, setRepeatType] = useState('weekly')
  const [seasonSignupDeadline, setSeasonSignupDeadline] = useState('')
  const [includeOrganizerInCount, setIncludeOrganizerInCount] = useState(false)
  
  // Custom game dates for seasons
  const [customGameDates, setCustomGameDates] = useState<Array<{id: string, date: string, time: string}>>([])
  
  // Discount code fields
  const [createDiscount, setCreateDiscount] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [discountDescription, setDiscountDescription] = useState('')
  const [discountType, setDiscountType] = useState('percentage')
  const [discountValue, setDiscountValue] = useState('')

  // Handle custom game dates when repeat type is custom
  useEffect(() => {
    if (repeatType === 'custom' && totalGames) {
      const numGames = parseInt(totalGames) || 0
      const newCustomDates = []
      
      for (let i = 0; i < numGames; i++) {
        newCustomDates.push({
          id: `custom-${i}`,
          date: '',
          time: ''
        })
      }
      
      setCustomGameDates(newCustomDates)
    } else {
      setCustomGameDates([])
    }
  }, [repeatType, totalGames])

  // Load Google Maps API with singleton pattern
  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      // Check if already loaded
      const googleWindow = window as GoogleMapsWindow
      if (googleWindow.google && googleWindow.google.maps && googleWindow.google.maps.places) {
        setIsGoogleMapsLoaded(true)
        return
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        // Script exists, wait for it to load
        existingScript.addEventListener('load', () => {
          setIsGoogleMapsLoaded(true)
        })
        return
      }

      // Create and load the script
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setIsGoogleMapsLoaded(true)
      }
      script.onerror = () => {
        console.error('Failed to load Google Maps API')
        setIsGoogleMapsLoaded(false)
      }
      document.head.appendChild(script)
    }

    loadGoogleMapsAPI()

    // Cleanup function
    return () => {
      // Don't remove the script as it might be used by other components
      // Just reset the state
      setIsGoogleMapsLoaded(false)
    }
  }, [])

  // Real location search using Google Places API
  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      // Check if Google Places API is available
      const googleWindow = window as GoogleMapsWindow
      if (isGoogleMapsLoaded && typeof window !== 'undefined' && googleWindow.google && googleWindow.google.maps && googleWindow.google.maps.places) {
        const service = new googleWindow.google.maps.places.AutocompleteService()
        
        service.getPlacePredictions(
          {
            input: query,
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'us' } // Restrict to US for now
          },
          (predictions, status) => {
            if (googleWindow.google && status === googleWindow.google.maps.places.PlacesServiceStatus.OK && predictions) {
              const suggestions = predictions.slice(0, 5).map(prediction => prediction.description)
              setLocationSuggestions(suggestions)
              setShowSuggestions(true)
            } else {
              setLocationSuggestions([])
              setShowSuggestions(false)
            }
          }
        )
      } else {
        // Fallback to mock data if Google Places API is not loaded
        const mockSuggestions = [
          'Central Park, New York, NY',
          'Prospect Park, Brooklyn, NY',
          'Soccerroof, Brooklyn, NY',
          'Chelsea Piers, New York, NY',
          'Randall\'s Island, New York, NY',
          'Flushing Meadows Park, Queens, NY',
          'Van Cortlandt Park, Bronx, NY',
          'Marine Park, Brooklyn, NY',
          'Astoria Park, Queens, NY',
          'Highbridge Park, Manhattan, NY'
        ].filter(loc => 
          loc.toLowerCase().includes(query.toLowerCase())
        )

        setLocationSuggestions(mockSuggestions.slice(0, 5))
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Error searching locations:', error)
      setLocationSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocation(value)
    searchLocations(value)
  }

  const selectLocation = (selectedLocation: string) => {
    setLocation(selectedLocation)
    setShowSuggestions(false)
    setLocationSuggestions([])
  }

  return (
    <div className="fixed inset-0 min-h-[100dvh] bg-gradient-to-b from-blue-500 to-teal-400 flex z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Safe-area overlays to prevent iOS status/home bar bleed-through */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] bg-gradient-to-b from-blue-500 to-teal-400 z-[51]" aria-hidden="true" />
      <div className="fixed bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)] bg-gradient-to-t from-teal-400 to-blue-500 z-[51]" aria-hidden="true" />
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-20 shrink-0 flex-col bg-gradient-to-b from-blue-500 to-teal-400 text-white p-4 items-center">
        <div className="mb-24">
          <Image src="/face.png" alt="Logo" width={40} height={40} />
        </div>
        <nav className="flex-1 flex flex-col items-center space-y-4">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <div
                key={s.id}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  i === stepIdx ? 'bg-white text-black' : 'bg-white/10 text-white/80'
                }`}
                title={s.label}
              >
                <Icon className="h-5 w-5" />
              </div>
            )
          })}
        </nav>
        <button onClick={onCancel} className="text-white/80 hover:text-white mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-white rounded-lg m-4 flex flex-col relative overflow-hidden">
        {/* Discard */}
        <div className="absolute top-4 right-4">
          <Button variant="outline" onClick={onCancel}>Discard</Button>
        </div>

        {/* Step Header (always at top) */}
        <div className="text-center mb-10 px-8 pt-6 sm:pt-8">
          <div className="text-sm">
            <span className="text-black">{step.label}</span>
            <span className="text-gray-500 ml-2">Step {stepIdx + 1} of {steps.length}</span>
          </div>
          {step.sub && (
            <div className="text-sm text-black mt-1">
              {step.sub}
            </div>
          )}
        </div>

        {/* Content that needs to be vertically centered */}
        <div className="flex-1 flex flex-col items-center justify-start w-full px-8 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <h1 className="hero-h1 text-5xl font-medium mb-8 text-center">
            {step.id === 'about' && 'What do you want to create?'}
            {step.id === 'location' && 'Where will it take place?'}
            {step.id === 'schedule' && 'When does it happen?'}
            {step.id === 'pricing' && 'Set your pricing'}
            {step.id === 'options' && 'Extra options'}
            {step.id === 'review' && 'Review & create'}
          </h1>

          <div className="w-full">
          {step.id === 'about' && (
            <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 border-2 rounded-xl ${type==='one-off'?'border-black':'border-gray-200'} cursor-pointer`} onClick={()=>setType('one-off')}>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-br from-stone-200 to-yellow-100 rounded-lg mb-3 flex items-center justify-center relative flex-shrink-0">
                      <div className="w-8 h-8 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                        <Image src="/game.png" alt="Game" width={64} height={64} className="w-8 h-8 sm:w-16 sm:h-16 rounded-full object-cover" />
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-black">One-off Game</div>
                      <div className="text-sm text-gray-600">Single date and time</div>
                    </div>
                  </div>
                </div>
                <div className={`p-4 border-2 rounded-xl ${type==='season'?'border-black':'border-gray-200'} cursor-pointer`} onClick={()=>setType('season')}>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-br from-stone-200 to-yellow-100 rounded-lg mb-3 flex items-center justify-center relative flex-shrink-0">
                      <div className="w-8 h-8 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                        <Image src="/calendar.png" alt="Calendar" width={64} height={64} className="w-8 h-8 sm:w-16 sm:h-16 rounded-full object-cover" />
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-black">Season</div>
                      <div className="text-sm text-gray-600">Multiple games under one season</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" placeholder={type==='season'?'Fall Season':'Pickup Friday'} />
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" rows={3} placeholder="Describe your game or season..." />
              </div>
            </div>
          )}

          {step.id === 'location' && (
            <div className="max-w-xl mx-auto space-y-6 px-4 sm:px-0">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Location</label>
                <div className="relative">
                  <input 
                    value={location} 
                    onChange={handleLocationChange}
                    onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none caret-black align-middle leading-[1.25rem]" 
                    placeholder={isGoogleMapsLoaded ? "Search for a location..." : "Loading location search..."} 
                    autoComplete="off"
                    disabled={!isGoogleMapsLoaded}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {locationSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                          onClick={() => selectLocation(suggestion)}
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{suggestion}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {isGoogleMapsLoaded 
                    ? "Start typing to search for addresses, venues, or landmarks" 
                    : "Loading Google Maps API..."
                  }
                </div>
              </div>
            </div>
          )}

          {step.id === 'schedule' && (
            <div className="max-w-2xl mx-auto px-4 sm:px-0">
              {type==='one-off' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Date</label>
                    <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Time</label>
                    <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Duration (hours)</label>
                    <input type="number" step="0.5" min="0.5" max="8" value={durationHours} onChange={e=>setDurationHours(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" placeholder="2.0" />
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {/* Initial season selection fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">First Game Date</label>
                      <input type="date" value={firstDate} onChange={e=>setFirstDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">First Game Time</label>
                      <input type="time" value={firstTime} onChange={e=>setFirstTime(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Season Signup Deadline</label>
                      <input type="date" value={seasonSignupDeadline} onChange={e=>setSeasonSignupDeadline(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Number of Games</label>
                      <input type="number" value={totalGames} onChange={e=>setTotalGames(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Repeat Type</label>
                      <select value={repeatType} onChange={e=>setRepeatType(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none">
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Custom game dates - shown below when custom is selected */}
                  {repeatType === 'custom' && (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600 mb-4">
                        Enter the date and time for each game in your season:
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-4 pr-2">
                        {customGameDates.map((game, index) => (
                          <div key={game.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-700">Game {index + 1}</span>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">Date</label>
                              <input
                                type="date"
                                value={game.date}
                                onChange={(e) => updateCustomGameDate(index, 'date', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">Time</label>
                              <input
                                type="time"
                                value={game.time}
                                onChange={(e) => updateCustomGameDate(index, 'time', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step.id === 'pricing' && (
            <div className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 px-4 sm:px-0">
              {type==='one-off' ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Price ($)</label>
                    <input type="number" value={price} onChange={e=>setPrice(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Spots</label>
                    <input type="number" value={spots} onChange={e=>setSpots(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Season Price ($)</label>
                    <input type="number" value={seasonPrice} onChange={e=>setSeasonPrice(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Game Price ($)</label>
                    <input type="number" value={gamePrice} onChange={e=>setGamePrice(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Season Spots</label>
                    <input type="number" value={seasonSpots} onChange={e=>setSeasonSpots(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Spots per Game</label>
                    <input type="number" value={gameSpots} onChange={e=>setGameSpots(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
                  </div>
                </>
              )}
            </div>
          )}

          {step.id === 'options' && (
            <div className="max-w-xl mx-auto space-y-6">
              {type==='season' && (
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="h-4 w-4" checked={allowIndividual} onChange={e=>setAllowIndividual(e.target.checked)} />
                  <span className="text-sm text-gray-700">Allow individual games to be sold</span>
                </label>
              )}
              
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="h-4 w-4" checked={includeOrganizerInCount} onChange={e=>setIncludeOrganizerInCount(e.target.checked)} />
                <span className="text-sm text-gray-700">Include organizer in player count</span>
              </label>
              
              <div>
                <label className="block text-sm text-gray-700 mb-1">Admin password</label>
                <input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" />
              </div>
              
              {/* Discount Code Section */}
              <div className="pt-6">
                <label className="flex items-center space-x-3 mb-4">
                  <input type="checkbox" className="h-4 w-4" checked={createDiscount} onChange={e=>setCreateDiscount(e.target.checked)} />
                  <span className="text-sm text-gray-700 font-medium">Create discount code</span>
                </label>
                
                {createDiscount && (
                  <div className="space-y-4 pl-7">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Discount Code</label>
                      <input value={discountCode} onChange={e=>setDiscountCode(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" placeholder="SUMMER20" />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Description</label>
                      <input value={discountDescription} onChange={e=>setDiscountDescription(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" placeholder="Summer discount" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Type</label>
                        <select value={discountType} onChange={e=>setDiscountType(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none">
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed Amount</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Value</label>
                        <input type="number" value={discountValue} onChange={e=>setDiscountValue(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none" placeholder={discountType==='percentage'?'20':'10'} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step.id === 'review' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="rounded-lg border p-4">
                <div className="font-medium mb-2">Summary</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>Type: {type === 'one-off' ? 'One-off game' : 'Season'}</div>
                  <div>Name: {name || '-'}</div>
                  {description && <div>Description: {description}</div>}
                  <div>Location: {location || '-'}</div>
                  {type==='one-off' ? (
                    <>
                      <div>Date & time: {date || '-'} {time || ''}</div>
                      <div>Duration: {durationHours} hours</div>
                    </>
                  ) : (
                    <>
                      <div>First game: {firstDate || '-'} {firstTime || ''}</div>
                      <div>Total games: {totalGames}</div>
                      <div>Repeat: {repeatType}</div>
                      {seasonSignupDeadline && <div>Signup deadline: {seasonSignupDeadline}</div>}
                    </>
                  )}
                  <div>Price: ${type==='one-off'?price:seasonPrice}</div>
                  <div>Spots: {type==='one-off'?spots:seasonSpots}</div>
                  {type==='season' && allowIndividual && <div>Individual games: ${gamePrice} ({gameSpots} spots)</div>}
                  {includeOrganizerInCount && <div>Include organizer in count: Yes</div>}
                  {createDiscount && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="font-medium">Discount Code:</div>
                      <div>Code: {discountCode}</div>
                      <div>Description: {discountDescription}</div>
                      <div>Type: {discountType === 'percentage' ? `${discountValue}%` : `$${discountValue}`}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="mt-auto border-t border-gray-200 w-full">
          <div className="flex items-center justify-between pt-6 px-8 pb-8">
            {stepIdx === 0 ? <div /> : (
              <Button variant="outline" onClick={back}>
                Back
              </Button>
            )}
            {step.id !== 'review' ? (
              <Button onClick={next} disabled={loading}>Next</Button>
            ) : (
              <Button 
                onClick={() => onComplete({
                  type,
                  name,
                  description,
                  location,
                  date,
                  time,
                  firstDate,
                  firstTime,
                  totalGames,
                  price,
                  spots,
                  seasonPrice,
                  gamePrice,
                  gameSpots,
                  seasonSpots,
                  allowIndividual,
                  durationHours,
                  repeatType,
                  seasonSignupDeadline,
                  includeOrganizerInCount,
                  adminPassword,
                  createDiscount,
                  discountCode,
                  discountDescription,
                  discountType,
                  discountValue,
                  customGameDates
                })}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create'}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}


