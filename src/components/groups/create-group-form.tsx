'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
// import { useAuth } from '@/contexts/auth-context'

interface CreateGroupFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreateGroupForm({ onSuccess, onCancel }: CreateGroupFormProps) {
  // const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    instagram: '',
    website: '',
    whatsapp_group: '',
    admin_password: '',
    confirm_password: '',
    photo_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !supabase) return

    setUploading(true)
    setError(null)

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `group-${Date.now()}.${fileExt}`
      const filePath = `group-photos/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(uploadError.message || 'Failed to upload image')
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, photo_url: publicUrl }))
      setPreviewUrl(publicUrl)
    } catch (err) {
      console.error('Error uploading image:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image'
      setError(errorMessage.includes('Bucket not found') 
        ? 'Storage not configured. Please contact the administrator.'
        : errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (formData.admin_password !== formData.confirm_password) {
        throw new Error('Passwords do not match')
      }

      if (formData.admin_password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // Hash the password (in production, use a proper hashing library)
      const hashedPassword = btoa(formData.admin_password) // Simple base64 encoding for demo

      // Parse tags from comma-separated string
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const { error } = await supabase
        .from('groups')
        .insert({
          name: formData.name,
          description: formData.description,
          tags: tagsArray,
          instagram: formData.instagram || null,
          website: formData.website || null,
          whatsapp_group: formData.whatsapp_group,
          admin_password: hashedPassword,
          photo_url: formData.photo_url || null,
        })

      if (error) {
        throw error
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Create New Group
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., NYC Women&apos;s Soccer"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Describe your group, playing style, skill level, etc."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Photo (optional)
            </label>
            <div className="flex items-start space-x-4">
              {previewUrl && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
                  <img
                    src={previewUrl}
                    alt="Group preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-black file:text-white
                    hover:file:bg-gray-800
                    file:cursor-pointer cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {uploading && (
                  <p className="mt-2 text-sm text-gray-500">Uploading...</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Upload a photo for your group (PNG, JPG, max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., beginner-friendly, competitive, pickup, indoor"
            />
          </div>

          {/* Instagram */}
          <div>
            <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
              Instagram Handle (optional)
            </label>
            <input
              id="instagram"
              type="text"
              value={formData.instagram}
              onChange={(e) => handleInputChange('instagram', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="@yourgroup"
            />
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Website (optional)
            </label>
            <input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="https://yourgroup.com"
            />
          </div>

          {/* WhatsApp Group */}
          <div>
            <label htmlFor="whatsapp_group" className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Group Link *
            </label>
            <input
              id="whatsapp_group"
              type="url"
              value={formData.whatsapp_group}
              onChange={(e) => handleInputChange('whatsapp_group', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="https://chat.whatsapp.com/..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Create a WhatsApp group and paste the invite link here
            </p>
          </div>

          {/* Admin Password */}
          <div>
            <label htmlFor="admin_password" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Password *
            </label>
            <input
              id="admin_password"
              type="password"
              value={formData.admin_password}
              onChange={(e) => handleInputChange('admin_password', e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Create a password for group management"
            />
            <p className="text-sm text-gray-500 mt-1">
              You&apos;ll need this password to add games and manage the group
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Admin Password *
            </label>
            <input
              id="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={(e) => handleInputChange('confirm_password', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Confirm your admin password"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating Group...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
