'use client'

import { Button } from "@/components/ui/button"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const { user, player, signOut } = useAuth()

  return (
    <header className="bg-transparent">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16">
          {/* Logo */}
          <div className="flex-1">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Image 
                src="/face.png" 
                alt="Logo" 
                width={32} 
                height={32} 
                className="w-8 h-8"
              />
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden md:flex items-center space-x-8 flex-1 justify-center">
            <Link href="/games" className="text-gray-600 hover:text-gray-900 transition-colors">
              Games
            </Link>
            <Link href="/groups" className="text-gray-600 hover:text-gray-900 transition-colors">
              Groups
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900 transition-colors">
              Profile
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4 flex-1 justify-end">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Hi, {player?.name || user.email}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setAuthMode('signin')
                  setAuthModalOpen(true)
                }}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Mobile Menu Drawer */}
            <div className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out">
              <div className="flex flex-col h-full">
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <Image 
                      src="/face.png" 
                      alt="Logo" 
                      width={32} 
                      height={32} 
                      className="w-8 h-8"
                    />
                    <span className="font-semibold text-gray-900">Menu</span>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Menu Content */}
                <nav className="flex-1 p-4">
                  <div className="space-y-6">
                    <Link 
                      href="/games" 
                      className="block text-lg text-gray-700 hover:text-gray-900 transition-colors py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Games
                    </Link>
                    <Link 
                      href="/groups" 
                      className="block text-lg text-gray-700 hover:text-gray-900 transition-colors py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Groups
                    </Link>
                    <Link 
                      href="/profile" 
                      className="block text-lg text-gray-700 hover:text-gray-900 transition-colors py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                  </div>

                  {/* User Actions */}
                  <div className="mt-8 pt-6 border-t">
                    {user ? (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                          Hi, {player?.name || user.email}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            signOut()
                            setIsMenuOpen(false)
                          }}
                          className="w-full"
                        >
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setAuthMode('signin')
                          setAuthModalOpen(true)
                          setIsMenuOpen(false)
                        }}
                        className="w-full"
                      >
                        Sign In
                      </Button>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </header>
  )
}
