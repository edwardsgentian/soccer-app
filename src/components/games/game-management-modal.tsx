'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CreateGameForm } from './create-game-form'
import { CreateGameOrSeasonForm } from './create-game-or-season-form'
import { CreateGameWizard } from './create-game-wizard'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

interface GameManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onGameCreated?: () => void
  groupId?: string
}

export function GameManagementModal({ 
  isOpen, 
  onClose, 
  onGameCreated,
  groupId 
}: GameManagementModalProps) {
  const { player } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(true)
  const [useNewForm, setUseNewForm] = useState(true)
  const [useWizard, setUseWizard] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'validation' | 'auth' | 'network' | 'database' | 'unknown' | null>(null)

  // Lock/unlock background scroll when wizard is active (must be a top-level hook)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const { body, documentElement } = document
    if (isOpen && useWizard) {
      // Lock scroll using overflow; avoid overscrollBehavior to prevent sticky state on iOS
      const prevBodyOverflow = body.style.overflow
      const prevHtmlOverflow = documentElement.style.overflow
      body.style.overflow = 'hidden'
      documentElement.style.overflow = 'hidden'
      return () => {
        body.style.overflow = prevBodyOverflow
        documentElement.style.overflow = prevHtmlOverflow
      }
    }
    return
  }, [isOpen, useWizard])

  if (!isOpen) return null

  const handleGameCreated = () => {
    setShowCreateForm(false)
    setError(null)
    setErrorType(null)
    onGameCreated?.()
    onClose()
  }

  const handleError = (error: unknown, context: string = '') => {
    console.error(`Error in ${context}:`, error)
    
    let errorMessage = 'An unexpected error occurred'
    let errorType: 'validation' | 'auth' | 'network' | 'database' | 'unknown' = 'unknown'
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      // Authentication errors
      if (message.includes('invalid admin password') || message.includes('permission denied') || message.includes('unauthorized')) {
        errorMessage = 'Invalid admin password. Please check your password and try again.'
        errorType = 'auth'
      }
      // Validation errors
      else if (message.includes('required') || message.includes('invalid') || message.includes('missing')) {
        errorMessage = 'Please fill in all required fields correctly.'
        errorType = 'validation'
      }
      // Network errors
      else if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.'
        errorType = 'network'
      }
      // Database errors
      else if (message.includes('database') || message.includes('sql') || message.includes('constraint') || message.includes('duplicate')) {
        errorMessage = 'Database error. Please try again or contact support if the problem persists.'
        errorType = 'database'
      }
      // RLS policy errors
      else if (message.includes('row-level security') || message.includes('rls')) {
        errorMessage = 'Permission error. Please contact support to fix database permissions.'
        errorType = 'database'
      }
      // Use the original error message if it's user-friendly
      else if (error.message.length < 100 && !message.includes('supabase') && !message.includes('internal')) {
        errorMessage = error.message
      }
    }
    
    setError(errorMessage)
    setErrorType(errorType)
  }

  const clearError = () => {
    setError(null)
    setErrorType(null)
  }

  const handleWizardComplete = async (wizardData: Record<string, unknown>) => {
    setLoading(true)
    clearError()
    
    try {
      console.log('Wizard data received:', wizardData)
      
      // Validation checks
      if (!groupId) {
        throw new Error('Group ID is required to create games')
      }
      
      if (!player?.id) {
        throw new Error('You must be signed in to create games or seasons')
      }
      
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      if (!wizardData.adminPassword || (typeof wizardData.adminPassword === 'string' && wizardData.adminPassword.trim() === '')) {
        throw new Error('Admin password is required')
      }
      
      // Verify admin password
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('admin_password')
        .eq('id', groupId)
        .single()

      if (groupError) {
        console.error('Group lookup error:', groupError)
        throw new Error('Group not found')
      }

      // Simple password verification (in production, use proper hashing)
      const hashedPassword = btoa(wizardData.adminPassword as string)
      
      if (groupData.admin_password !== hashedPassword) {
        throw new Error('Invalid admin password')
      }

      console.log('Password verified, creating...')

      // Create based on type
      if (wizardData.type === 'one-off') {
        await createOneOffGame(wizardData)
      } else {
        await createSeason(wizardData)
      }
      
      console.log('Creation successful!')
      handleGameCreated()
    } catch (err) {
      handleError(err, 'wizard creation')
    } finally {
      setLoading(false)
    }
  }

  const createOneOffGame = async (data: Record<string, unknown>) => {
    try {
      const { data: game, error } = await supabase
        .from('games')
        .insert({
          group_id: groupId,
          name: data.name,
          description: data.description,
          game_date: data.date,
          game_time: data.time,
          location: data.location,
          price: parseFloat(data.price as string),
          total_tickets: parseInt(data.spots as string),
          available_tickets: parseInt(data.spots as string),
          duration_hours: parseFloat(data.durationHours as string),
          created_by: player?.id,
          is_individual_sale_allowed: true
        })
        .select()
        .single()

      if (error) throw error

      // Add organizer as attendee if include_organizer_in_count is true
      if (data.includeOrganizerInCount && player?.id) {
        console.log('Adding organizer as attendee for one-off game')
        const { error: attendeeError } = await supabase
          .from('game_attendees')
          .insert({
            game_id: game.id,
            player_id: player.id,
            payment_status: 'completed',
            amount_paid: 0, // Organizer doesn't pay
            attendance_status: 'attending'
          })

        if (attendeeError) {
          console.error('Error adding organizer as attendee:', attendeeError)
          // Don't fail the entire operation, just log the error
        } else {
          console.log('Organizer added as attendee successfully')
        }
      }

      // Create discount code if requested
      if (data.createDiscount) {
        await createDiscountCode(data, null)
      }
    } catch (error) {
      handleError(error, 'one-off game creation')
      throw error // Re-throw to stop the process
    }
  }

  const createSeason = async (data: Record<string, unknown>) => {
    try {
      console.log('Creating season...')
      
      // Create season
      const { data: season, error: seasonError } = await supabase
        .from('seasons')
        .insert({
          group_id: groupId,
          name: data.name,
          description: data.description,
          season_price: parseFloat(data.seasonPrice as string),
          individual_game_price: parseFloat(data.gamePrice as string),
          total_games: parseInt(data.totalGames as string),
          season_spots: parseInt(data.seasonSpots as string),
          game_spots: parseInt(data.gameSpots as string),
          first_game_date: data.firstDate,
          first_game_time: data.firstTime,
          repeat_type: data.repeatType,
          allow_individual_sales: data.allowIndividual,
          season_signup_deadline: data.seasonSignupDeadline,
          include_organizer_in_count: data.includeOrganizerInCount,
          location: data.location,
          created_by: player?.id
        })
        .select()
        .single()

      if (seasonError) {
        console.error('Season creation error:', seasonError)
        if (seasonError.message.includes('row-level security policy')) {
          throw new Error('Permission denied: Please run the RLS policy fix in Supabase first. See fix-rls-policy.sql file.')
        }
        throw new Error(`Failed to create season: ${seasonError.message}`)
      }

      console.log('Season created successfully:', season.id)

      // Create individual games
      const gameDates = generateGameDates(data)
      console.log(`Creating ${gameDates.length} games...`)
      
      const gamesToInsert = gameDates.map((gameDate, index) => ({
        group_id: groupId,
        season_id: season.id,
        game_number: index + 1,
        name: `${data.name} - Game ${index + 1}`,
        description: data.description,
        game_date: gameDate.date,
        game_time: gameDate.time,
        location: data.location,
        price: parseFloat(data.gamePrice as string),
        total_tickets: parseInt(data.gameSpots as string),
        available_tickets: parseInt(data.gameSpots as string),
        duration_hours: 2.0,
        created_by: player?.id,
        is_individual_sale_allowed: data.allowIndividual
      }))

      const { data: createdGames, error: gamesError } = await supabase
        .from('games')
        .insert(gamesToInsert)
        .select()

      if (gamesError) {
        console.error('Games creation error:', gamesError)
        throw new Error(`Failed to create games: ${gamesError.message}`)
      }

      console.log('Games created successfully')

      // Add organizer as attendee to all games if include_organizer_in_count is true
      if (data.includeOrganizerInCount && player?.id && createdGames) {
        console.log('Adding organizer as attendee to all season games')
        
        const organizerAttendees = createdGames.map(game => ({
          game_id: game.id,
          player_id: player.id,
          payment_status: 'completed',
          amount_paid: 0, // Organizer doesn't pay
          attendance_status: 'attending'
        }))

        const { error: attendeeError } = await supabase
          .from('game_attendees')
          .insert(organizerAttendees)

        if (attendeeError) {
          console.error('Error adding organizer as attendee to season games:', attendeeError)
          // Don't fail the entire operation, just log the error
        } else {
          console.log('Organizer added as attendee to all season games successfully')
        }
      }

      // Create discount code if requested
      if (data.createDiscount) {
        console.log('Creating discount code...')
        await createDiscountCode(data, season.id)
      }
      
      console.log('Season creation completed successfully')
    } catch (error) {
      handleError(error, 'season creation')
      throw error // Re-throw to stop the process
    }
  }

  const createDiscountCode = async (data: Record<string, unknown>, seasonId: string | null) => {
    const { error } = await supabase
      .from('discount_codes')
      .insert({
        code: data.discountCode,
        description: data.discountDescription,
        discount_type: data.discountType,
        discount_value: parseFloat(data.discountValue as string),
        season_id: seasonId,
        created_by: player?.id
      })

    if (error) throw error
  }

  const generateGameDates = (data: Record<string, unknown>) => {
    // If custom dates are provided, use them directly
    if (data.repeatType === 'custom' && data.customGameDates && Array.isArray(data.customGameDates) && data.customGameDates.length > 0) {
      return (data.customGameDates as Array<{date: string, time: string}>).map((game) => ({
        date: game.date,
        time: game.time
      }))
    }

    // Otherwise, generate dates based on repeat pattern
    const dates = []
    const startDate = new Date(data.firstDate as string)
    const startTime = data.firstTime as string
    const totalGames = parseInt(data.totalGames as string)
    const repeatType = data.repeatType as string

    for (let i = 0; i < totalGames; i++) {
      const gameDate = new Date(startDate)
      
      if (repeatType === 'weekly') {
        gameDate.setDate(startDate.getDate() + (i * 7))
      } else if (repeatType === 'bi-weekly') {
        gameDate.setDate(startDate.getDate() + (i * 14))
      }
      
      dates.push({
        date: gameDate.toISOString().split('T')[0],
        time: startTime
      })
    }
    
    return dates
  }


  // If wizard selected, replace modal with full-screen takeover
  if (useWizard) {
    return (
      <div className="relative">
        {error && (
          <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-4 rounded-lg shadow-lg max-w-md ${
            errorType === 'auth' 
              ? 'bg-red-100 border border-red-400 text-red-700' 
              : errorType === 'validation'
              ? 'bg-yellow-100 border border-yellow-400 text-yellow-700'
              : errorType === 'network'
              ? 'bg-blue-100 border border-blue-400 text-blue-700'
              : errorType === 'database'
              ? 'bg-orange-100 border border-orange-400 text-orange-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {errorType === 'auth' && 'Authentication Error'}
                  {errorType === 'validation' && 'Validation Error'}
                  {errorType === 'network' && 'Network Error'}
                  {errorType === 'database' && 'Database Error'}
                  {errorType === 'unknown' && 'Error'}
                </div>
                <div className="text-sm mt-1">{error}</div>
              </div>
              <button 
                onClick={clearError}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <CreateGameWizard
          onCancel={onClose}
          onComplete={handleWizardComplete}
          loading={loading}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6">
          {showCreateForm ? (
            <div>
              {/* Form Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Create Game or Season
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Form:</span>
                    <button
                      onClick={() => setUseWizard(true)}
                      className={`px-3 py-1 text-sm rounded ${
                        useWizard 
                          ? 'bg-black text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Wizard
                    </button>
                    <button
                      onClick={() => { setUseWizard(false); setUseNewForm(true) }}
                      className={`px-3 py-1 text-sm rounded ${
                        !useWizard && useNewForm 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      New (Season/Game)
                    </button>
                    <button
                      onClick={() => { setUseWizard(false); setUseNewForm(false) }}
                      className={`px-3 py-1 text-sm rounded ${
                        !useWizard && !useNewForm 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Legacy (Game Only)
                    </button>
                  </div>
                </div>
              </div>

              {useWizard ? (
                <CreateGameWizard
                  onCancel={onClose}
                  onComplete={() => handleGameCreated()}
                />
              ) : useNewForm ? (
                <CreateGameOrSeasonForm
                  groupId={groupId || ''}
                  onSuccess={handleGameCreated}
                />
              ) : (
                <CreateGameForm
                  groupId={groupId || ''}
                  onSuccess={handleGameCreated}
                />
              )}
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Game Management
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Create a New Game
                  </h3>
                  <p className="text-green-700 text-sm">
                    Set up a new soccer game with date, time, location, price, and ticket capacity.
                    You&apos;ll need the group admin password to create games.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Manage Existing Games
                  </h3>
                  <p className="text-blue-700 text-sm">
                    View attendees, manage tickets, and update game details for existing games.
                    Access requires group admin password.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setShowCreateForm(true)}
                >
                  Create New Game
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Implement manage existing games
                    alert('Manage existing games feature coming soon!')
                  }}
                >
                  Manage Existing Games
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
