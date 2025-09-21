'use client'

import { useState } from 'react'
import { PaymentForm } from './payment-form'
import { X } from 'lucide-react'

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

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  game: Game | null
  onSuccess?: () => void
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  game,
  onSuccess 
}: PaymentModalProps) {
  if (!isOpen || !game) return null

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
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
          <PaymentForm
            game={game}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}
