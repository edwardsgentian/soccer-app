'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateGroupForm } from './create-group-form'
import { X } from 'lucide-react'

interface GroupManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onGroupCreated?: () => void
}

export function GroupManagementModal({ 
  isOpen, 
  onClose, 
  onGroupCreated 
}: GroupManagementModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(true)

  if (!isOpen) return null

  const handleGroupCreated = () => {
    setShowCreateForm(false)
    onGroupCreated?.()
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
            <CreateGroupForm
              onSuccess={handleGroupCreated}
              onCancel={handleCancel}
            />
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Group Management
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Create a New Group
                  </h3>
                  <p className="text-green-700 text-sm">
                    Start a new soccer group to organize games and connect with players.
                    You&apos;ll set up an admin password to manage the group.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Manage Existing Group
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Already have a group? Enter your admin password to manage games,
                    view members, and update group details.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setShowCreateForm(true)}
                >
                  Create New Group
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Implement manage existing group
                    alert('Manage existing group feature coming soon!')
                  }}
                >
                  Manage Existing Group
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
