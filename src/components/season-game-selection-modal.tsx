'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Game {
  id: string
  name: string
  game_date: string
  game_time: string
  location: string
  total_tickets: number
}

interface SeasonGameSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  seasonId: string
  playerId: string
  onSuccess: () => void
}

export function SeasonGameSelectionModal({
  isOpen,
  onClose,
  seasonId,
  playerId,
  onSuccess
}: SeasonGameSelectionModalProps) {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [gameAttendance, setGameAttendance] = useState<Record<string, 'attending' | 'not_attending'>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSeasonGames = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id, name, game_date, game_time, location, total_tickets')
        .eq('season_id', seasonId)
        .order('game_date', { ascending: true })

      if (error) {
        throw error
      }

      setGames(data || [])
      
      // Initialize all games as not attending by default
      const initialAttendance: Record<string, 'attending' | 'not_attending'> = {}
      data?.forEach(game => {
        initialAttendance[game.id] = 'not_attending'
      })
      setGameAttendance(initialAttendance)
    } catch (err) {
      console.error('Error fetching season games:', err)
      setError('Failed to load season games')
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    if (isOpen && seasonId) {
      fetchSeasonGames()
    }
  }, [isOpen, seasonId, fetchSeasonGames])

  const handleGameToggle = (gameId: string) => {
    setGameAttendance(prev => ({
      ...prev,
      [gameId]: prev[gameId] === 'attending' ? 'not_attending' : 'attending'
    }))
  }

  const handleMarkAllAttending = () => {
    const allAttending: Record<string, 'attending' | 'not_attending'> = {}
    games.forEach(game => {
      allAttending[game.id] = 'attending'
    })
    setGameAttendance(allAttending)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/update-season-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonId,
          playerId,
          gameAttendance
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update attendance')
      }

      onSuccess()
      onClose()
      // Redirect to success page
      router.push('/success')
    } catch (err) {
      console.error('Error saving attendance:', err)
      setError(err instanceof Error ? err.message : 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-white z-50 flex flex-col"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Header - Mobile Full Screen */}
          <motion.div 
            className="flex items-center justify-center p-6 border-b bg-white"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-gray-900">
              Add Attendance
            </h2>
          </motion.div>

          {/* Content - Scrollable */}
          <motion.div 
            className="flex-1 overflow-y-auto p-6 pb-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {loading ? (
              <motion.div 
                className="text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading games...</p>
              </motion.div>
            ) : (
              <>
                <motion.div 
                  className="mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <Button
                    onClick={handleMarkAllAttending}
                    variant="outline"
                    className="w-full"
                  >
                    Mark All as Attending
                  </Button>
                </motion.div>

                <div className="space-y-4">
                  {games.map((game, index) => (
                    <motion.div
                      key={game.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        gameAttendance[game.id] === 'attending'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleGameToggle(game.id)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + (index * 0.1), duration: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{game.name}</h3>
                          <div className="text-sm text-gray-600 mt-1">
                            <p>{formatDate(game.game_date)} at {formatTime(game.game_time)}</p>
                            <p>{game.location}</p>
                          </div>
                        </div>
                        <motion.div 
                          className="ml-4"
                          animate={{ 
                            scale: gameAttendance[game.id] === 'attending' ? 1.1 : 1,
                            rotate: gameAttendance[game.id] === 'attending' ? 360 : 0
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {gameAttendance[game.id] === 'attending' ? (
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center">
                              <XCircle className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-red-600 text-sm">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>

          {/* Sticky Bottom Buttons */}
          <motion.div 
            className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-end gap-3"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="w-full"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Add Attendance'}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
