'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import Image from 'next/image'

interface ProfileFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  isEditing?: boolean
}

export function ProfileForm({ onSuccess, onCancel, isEditing = false }: ProfileFormProps) {
  const { user, player, refreshPlayer } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    photo_url: '',
    
    // Soccer-specific questions
    sport: '',
    playing_experience: '',
    skill_level: '',
    favorite_team: '',
    favorite_player: '',
    other_sports: '',
    languages: '',
    home_location: '',
    originally_from: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing && player) {
      setFormData({
        name: player.name || '',
        email: player.email || '',
        phone: player.phone || '',
        instagram: player.instagram || '',
        photo_url: player.photo_url || '',
        sport: (player as { sport?: string }).sport || '',
        playing_experience: player.playing_experience || '',
        skill_level: player.skill_level || '',
        favorite_team: player.favorite_team || '',
        favorite_player: player.favorite_player || '',
        other_sports: player.other_sports || '',
        languages: player.languages?.join(', ') || '',
        home_location: player.home_location || '',
        originally_from: (player as { originally_from?: string }).originally_from || '',
      })
      setPreviewUrl(player.photo_url || null)
    }
  }, [isEditing, player])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Convert to base64 for simple storage
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setPreviewUrl(base64String)
        handleInputChange('photo_url', base64String)
        setUploading(false)
      }
      reader.onerror = () => {
        setError('Failed to read image file')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Failed to upload image')
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!supabase || !user) {
        throw new Error('User not authenticated')
      }

      // Parse languages from comma-separated string
      const languagesArray = formData.languages
        .split(',')
        .map(lang => lang.trim())
        .filter(lang => lang.length > 0)

      const profileData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        instagram: formData.instagram || null,
        photo_url: formData.photo_url || null,
        sport: formData.sport || null,
        playing_experience: formData.playing_experience || null,
        skill_level: formData.skill_level || null,
        favorite_team: formData.favorite_team || null,
        favorite_player: formData.favorite_player || null,
        other_sports: formData.other_sports || null,
        languages: languagesArray,
        home_location: formData.home_location || null,
        originally_from: formData.originally_from || null,
      }

      // Database operation
      const dbOperation = async () => {
        if (isEditing) {
          // Update existing profile
          const { error } = await supabase
            .from('players')
            .update(profileData)
            .eq('id', user.id)

          if (error) {
            throw error
          }
        } else {
          // Create new profile
          const { error } = await supabase
            .from('players')
            .insert({
              id: user.id,
              ...profileData,
            })

          if (error) {
            throw error
          }
        }
      }

      // Race between the database operation and timeout
      await dbOperation()

      // If we get here, the database operation succeeded
      try {
        await refreshPlayer()
      } catch (refreshError) {
        console.warn('Profile saved but failed to refresh:', refreshError)
        // Don't throw here - the profile was saved successfully
      }
      
      // Reset retry count on success
      setRetryCount(0)
      onSuccess?.()
    } catch (err) {
      console.error('Profile save error:', err)
      console.error('Full error details:', JSON.stringify(err, null, 2))
      
      // Provide more specific error messages
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          setError('Request timed out. Please check your internet connection and try again.')
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error. Please check your internet connection and try again.')
        } else if (err.message.includes('duplicate') || err.message.includes('unique')) {
          setError('This email is already registered. Please use a different email address.')
        } else if (err.message.includes('permission') || err.message.includes('unauthorized')) {
          setError('Permission denied. Please sign out and sign back in.')
        } else {
          setError(`Error saving profile: ${err.message}`)
        }
      } else if (typeof err === 'object' && err !== null) {
        // Handle Supabase error objects
        const supabaseError = err as { message?: string; details?: string; hint?: string; code?: string }
        const errorMsg = supabaseError.message || supabaseError.details || supabaseError.hint || 'Unknown error'
        setError(`Error saving profile: ${errorMsg}`)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setError(null)
    // Trigger form submission again
    const form = document.querySelector('form')
    if (form) {
      form.requestSubmit()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {isEditing ? 'Edit Profile' : 'Complete Your Profile'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram Handle
                </label>
                <input
                  id="instagram"
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="@yourusername"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Photo
                </label>
                <div className="flex items-center gap-6">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    <div className="relative w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      {previewUrl ? (
                        <Image
                          src={previewUrl}
                          alt="Profile preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-3xl text-gray-400 font-bold">
                          {formData.name.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Upload button */}
                  <div className="flex-1">
                    <input
                      type="file"
                      id="photo_upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo_upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                    >
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Experience Questions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="sport" className="block text-sm font-medium text-gray-700 mb-1">
                  Select a sport
                </label>
                <select
                  id="sport"
                  value={formData.sport}
                  onChange={(e) => handleInputChange('sport', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">Select a sport</option>
                  <option value="Soccer">Soccer</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Volleyball">Volleyball</option>
                  <option value="Baseball">Baseball</option>
                  <option value="Softball">Softball</option>
                  <option value="Football">Football</option>
                  <option value="Rugby">Rugby</option>
                  <option value="Hockey">Hockey</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="playing_experience" className="block text-sm font-medium text-gray-700 mb-1">
                  How long have you been playing
                </label>
                <select
                  id="playing_experience"
                  value={formData.playing_experience}
                  onChange={(e) => handleInputChange('playing_experience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">Select experience level</option>
                  <option value="Just starting out">Just starting out</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1-3 years">1-3 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="5-10 years">5-10 years</option>
                  <option value="10+ years">10+ years</option>
                </select>
              </div>

              <div>
                <label htmlFor="skill_level" className="block text-sm font-medium text-gray-700 mb-1">
                  Describe your skill level
                </label>
                <select
                  id="skill_level"
                  value={formData.skill_level}
                  onChange={(e) => handleInputChange('skill_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">Select skill level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Recreational">Recreational</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Semi-professional">Semi-professional</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="favorite_team" className="block text-sm font-medium text-gray-700 mb-1">
                    Favorite Team
                  </label>
                  <input
                    id="favorite_team"
                    type="text"
                    value={formData.favorite_team}
                    onChange={(e) => handleInputChange('favorite_team', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="e.g., Arsenal, Barcelona, USWNT"
                  />
                </div>

                <div>
                  <label htmlFor="favorite_player" className="block text-sm font-medium text-gray-700 mb-1">
                    Favorite Player
                  </label>
                  <input
                    id="favorite_player"
                    type="text"
                    value={formData.favorite_player}
                    onChange={(e) => handleInputChange('favorite_player', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="e.g., Messi, Rapinoe, Kerr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="other_sports" className="block text-sm font-medium text-gray-700 mb-1">
                  Do you play or follow any other sports?
                </label>
                <textarea
                  id="other_sports"
                  value={formData.other_sports}
                  onChange={(e) => handleInputChange('other_sports', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="e.g., Basketball, Tennis, Running..."
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-1">
                  Languages (comma-separated)
                </label>
                <input
                  id="languages"
                  type="text"
                  value={formData.languages}
                  onChange={(e) => handleInputChange('languages', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="e.g., English, Spanish, French"
                />
              </div>

              <div>
                <label htmlFor="home_location" className="block text-sm font-medium text-gray-700 mb-1">
                  Home Location
                </label>
                <input
                  id="home_location"
                  type="text"
                  value={formData.home_location}
                  onChange={(e) => handleInputChange('home_location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="e.g., Manhattan, Brooklyn, Queens"
                />
              </div>

              <div>
                <label htmlFor="originally_from" className="block text-sm font-medium text-gray-700 mb-1">
                  Originally From
                </label>
                <input
                  id="originally_from"
                  type="text"
                  value={formData.originally_from}
                  onChange={(e) => handleInputChange('originally_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="e.g., London, Paris, Tokyo"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                {(error.includes('timeout') || error.includes('network') || error.includes('unexpected')) && retryCount < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="ml-2 text-red-600 border-red-300 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                )}
              </div>
              {retryCount > 0 && (
                <div className="text-xs text-red-500 mt-1">
                  Retry attempt: {retryCount}/3
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                isEditing ? 'Update Profile' : 'Save Profile'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
