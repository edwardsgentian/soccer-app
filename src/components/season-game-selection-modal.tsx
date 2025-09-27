'use client'

import { useState, useEffect } from 'react'
import { X, Check, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Select Games to Attend
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading games...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <Button
                  onClick={handleMarkAllAttending}
                  variant="outline"
                  className="w-full"
                >
                  Mark All as Attending
                </Button>
              </div>

              <div className="space-y-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      gameAttendance[game.id] === 'attending'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleGameToggle(game.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{game.name}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>{formatDate(game.game_date)} at {formatTime(game.game_time)}</p>
                          <p>{game.location}</p>
                        </div>
                      </div>
                      <div className="ml-4">
                        {gameAttendance[game.id] === 'attending' ? (
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>
    </div>
  )
}
