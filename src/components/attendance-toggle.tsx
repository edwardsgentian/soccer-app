'use client'

import { useState } from 'react'
import { Check, X, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
      const response = await fetch('/api/update-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          seasonId,
          playerId,
          attendanceStatus: newStatus
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update attendance')
      }

      onStatusChange(newStatus)
    } catch (err) {
      console.error('Error updating attendance:', err)
      setError(err instanceof Error ? err.message : 'Failed to update attendance')
    } finally {
      setLoading(false)
    }
  }

  const getButtonContent = () => {
    if (!hasPaid) {
      return (
        <>
          <Users className="w-4 h-4 mr-2" />
          Not Paid
        </>
      )
    }

    if (currentStatus === 'attending') {
      return (
        <>
          <Check className="w-4 h-4 mr-2" />
          Attending
        </>
      )
    } else {
      return (
        <>
          <X className="w-4 h-4 mr-2" />
          Not Attending
        </>
      )
    }
  }

  const getButtonVariant = () => {
    if (!hasPaid) return 'outline'
    if (currentStatus === 'attending') return 'default'
    return 'outline'
  }

  const getButtonClassName = () => {
    if (!hasPaid) return 'opacity-50 cursor-not-allowed'
    if (currentStatus === 'attending') return 'bg-green-600 hover:bg-green-700 text-white'
    if (isGameFull && currentStatus === 'not_attending') return 'opacity-50 cursor-not-allowed'
    return ''
  }

  const isDisabled = !hasPaid || loading || (isGameFull && currentStatus === 'not_attending')

  return (
    <div className="space-y-2">
      <Button
        onClick={handleToggle}
        disabled={isDisabled}
        variant={getButtonVariant()}
        className={getButtonClassName()}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Updating...
          </>
        ) : (
          getButtonContent()
        )}
      </Button>

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
