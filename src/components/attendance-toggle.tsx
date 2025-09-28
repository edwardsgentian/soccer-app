'use client'

import { useState } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface AttendanceToggleProps {
  gameId: string
  seasonId?: string
  playerId: string
  currentStatus: 'attending' | 'not_attending'
  hasPaid: boolean
  isGameFull: boolean
  onStatusChange: (status: 'attending' | 'not_attending') => void
}

export function AttendanceToggle({
  gameId,
  seasonId,
  playerId,
  currentStatus,
  hasPaid,
  isGameFull,
  onStatusChange
}: AttendanceToggleProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async () => {
    if (!hasPaid) return

    const newStatus = currentStatus === 'attending' ? 'not_attending' : 'attending'
    
    // Check if trying to attend a full game
    if (newStatus === 'attending' && isGameFull) {
      setError('Game is full')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestData = {
        gameId,
        seasonId,
        playerId,
        attendanceStatus: newStatus
      }
      console.log('Sending attendance update request:', requestData)
      
      const response = await fetch('/api/update-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()
      console.log('API response:', { status: response.status, result })

      if (!response.ok) {
        console.error('API error response:', result)
        throw new Error(result.error || 'Failed to update attendance')
      }

      console.log('Calling onStatusChange with:', newStatus)
      onStatusChange(newStatus)
    } catch (err) {
      console.error('Error updating attendance:', err)
      setError(err instanceof Error ? err.message : 'Failed to update attendance')
    } finally {
      setLoading(false)
    }
  }


  const isDisabled = !hasPaid || loading || (isGameFull && currentStatus === 'not_attending')

  return (
    <div className="space-y-3">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">
            {currentStatus === 'attending' ? 'Attending' : 'Not Attending'}
          </span>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          )}
        </div>
        
        <motion.button
          onClick={handleToggle}
          disabled={isDisabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
            currentStatus === 'attending' 
              ? 'bg-green-600' 
              : 'bg-gray-200'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform`}
            animate={{
              x: currentStatus === 'attending' ? 20 : 2
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
          />
        </motion.button>
      </div>

      {/* Status Icons */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center space-x-2 ${currentStatus === 'attending' ? 'text-green-600' : 'text-gray-400'}`}>
          <Check className="w-4 h-4" />
          <span className="text-sm">Attending</span>
        </div>
        <div className={`flex items-center space-x-2 ${currentStatus === 'not_attending' ? 'text-red-600' : 'text-gray-400'}`}>
          <X className="w-4 h-4" />
          <span className="text-sm">Not Attending</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}

      {isGameFull && currentStatus === 'not_attending' && hasPaid && (
        <div className="text-sm text-gray-500">
          Game is full. You can mark yourself as not attending to free up your spot.
        </div>
      )}
    </div>
  )
}
