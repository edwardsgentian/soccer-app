'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, XCircle, X, Calendar, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

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
      // Redirect to profile page to show their games
      router.push('/profile')
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
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ backgroundColor: '#EEC996' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Logo */}
          <div className="absolute top-4 left-4 z-10">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <Image src="/face.png" alt="Logo" width={32} height={32} className="w-8 h-8" />
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          {/* Main Card */}
          <motion.div 
            className="bg-white rounded-lg w-full max-w-[420px] max-h-[80vh] shadow-lg my-8 flex flex-col"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Header */}
            <div className="p-6 flex-shrink-0">
              <h2 className="text-2xl font-medium text-gray-900 font-serif text-center mb-2">
                Add Attendance
              </h2>
              <p className="text-sm text-gray-600 text-center">
                Attendance can be changed at anytime. Adding attendance upfront guarantees you're counted for each game
              </p>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6">
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
                  className="mb-2"
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
                          ? ''
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{
                        borderColor: gameAttendance[game.id] === 'attending' ? '#4FA481' : undefined,
                        backgroundColor: gameAttendance[game.id] === 'attending' ? '#E0F7EE' : undefined
                      }}
                      onClick={() => handleGameToggle(game.id)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + (index * 0.1), duration: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{game.name}</h3>
                          <div className="text-sm text-gray-600 mt-2 space-y-1">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              <span>{formatDate(game.game_date)} at {formatTime(game.game_time)}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              <span>{game.location}</span>
                            </div>
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
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4FA481' }}>
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
            </div>

            {/* Bottom Button */}
            <div className="p-6 flex-shrink-0">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Add Attendance'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
