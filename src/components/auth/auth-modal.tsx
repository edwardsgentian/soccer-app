'use client'

import { useState } from 'react'
import { SignInForm } from './sign-in-form'
import { SignUpForm } from './sign-up-form'
import { X } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'signin' | 'signup'
  prefillData?: {
    name?: string
    email?: string
    phone?: string
  }
  onSuccess?: () => void
}

export function AuthModal({ 
  isOpen, 
  onClose, 
  initialMode = 'signin',
  prefillData,
  onSuccess 
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)

  if (!isOpen) return null

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6">
          {mode === 'signin' ? (
            <SignInForm
              onSuccess={handleSuccess}
              onSwitchToSignUp={() => setMode('signup')}
            />
          ) : (
            <SignUpForm
              onSuccess={handleSuccess}
              onSwitchToSignIn={() => setMode('signin')}
              prefillData={prefillData}
            />
          )}
        </div>
      </div>
    </div>
  )
}
