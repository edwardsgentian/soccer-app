'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tag, X } from 'lucide-react'

interface DiscountCodeInputProps {
  onApplyDiscount: (code: string) => Promise<{ success: boolean; discount?: number; error?: string }>
  appliedCode?: string
  onRemoveDiscount: () => void
  originalPrice: number
}

export function DiscountCodeInput({ 
  onApplyDiscount, 
  appliedCode, 
  onRemoveDiscount
}: DiscountCodeInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await onApplyDiscount(code.trim())
      if (result.success) {
        setCode('')
      } else {
        setError(result.error || 'Invalid discount code')
      }
    } catch {
      setError('Failed to apply discount code')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply()
    }
  }

  return (
    <div className="space-y-3">
      {appliedCode ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <Tag className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">
              Discount applied: {appliedCode}
            </span>
          </div>
          <button
            onClick={onRemoveDiscount}
            className="text-green-600 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter discount code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            <Button
              onClick={handleApply}
              disabled={loading || !code.trim()}
              size="sm"
              variant="outline"
            >
              {loading ? 'Applying...' : 'Apply'}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

