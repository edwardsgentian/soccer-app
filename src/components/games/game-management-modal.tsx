'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateGameForm } from './create-game-form'
import { X } from 'lucide-react'

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
  const [showCreateForm, setShowCreateForm] = useState(false)

  if (!isOpen) return null

  const handleGameCreated = () => {
    setShowCreateForm(false)
    onGameCreated?.()
    onClose()
  }

  const handleCancel = () => {
    setShowCreateForm(false)
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
          {showCreateForm ? (
            <CreateGameForm
              groupId={groupId}
              onSuccess={handleGameCreated}
              onCancel={handleCancel}
            />
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
                  className="bg-green-600 hover:bg-green-700"
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
