'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { X } from 'lucide-react'
import Image from 'next/image'

interface GroupEditFormProps {
  groupId: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface GroupData {
  name: string
  description: string
  tags: string[]
  instagram: string
  website: string
  whatsapp_group: string
  photo_url: string
}

export function GroupEditForm({ groupId, onSuccess, onCancel }: GroupEditFormProps) {
  const { player } = useAuth()
  const [formData, setFormData] = useState<GroupData>({
    name: '',
    description: '',
    tags: [],
    instagram: '',
    website: '',
    whatsapp_group: '',
    photo_url: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!supabase) return

      try {
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single()

        if (error) throw error

        setFormData({
          name: data.name || '',
          description: data.description || '',
          tags: data.tags || [],
          instagram: data.instagram || '',
          website: data.website || '',
          whatsapp_group: data.whatsapp_group || '',
          photo_url: data.photo_url || '',
        })
        setPreviewUrl(data.photo_url || null)
      } catch (err) {
        console.error('Error fetching group:', err)
        setError('Failed to load group data')
      }
    }

    fetchGroupData()
  }, [groupId])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !supabase) return

    setUploading(true)
    setError(null)

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${groupId}-${Date.now()}.${fileExt}`
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
      if (!supabase) {
        throw new Error('Supabase not initialized')
      }

      if (!player?.id) {
        throw new Error('You must be logged in to edit this group')
      }

      // Use API route to update group (bypasses RLS issues)
      const response = await fetch('/api/update-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          playerId: player.id,
          updates: {
            name: formData.name,
            description: formData.description,
            tags: formData.tags,
            instagram: formData.instagram || null,
            website: formData.website || null,
            whatsapp_group: formData.whatsapp_group || null,
            photo_url: formData.photo_url || null,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update group')
      }

      onSuccess?.()
    } catch (err) {
      console.error('Error updating group:', err)
      const errorMsg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? (err as { message: string }).message : 'Failed to update group')
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof GroupData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Edit Group
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Describe your group..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Photo
                </label>
                <div className="flex items-start space-x-4">
                  {previewUrl && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
                      <Image
                        src={previewUrl}
                        alt="Group preview"
                        fill
                        className="object-cover"
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

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Add a tag (press Enter)"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Social & Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Social & Contact</h3>
            <div className="space-y-4">
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
                  placeholder="@groupname"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label htmlFor="whatsapp_group" className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Group Link
                </label>
                <input
                  id="whatsapp_group"
                  type="url"
                  value={formData.whatsapp_group}
                  onChange={(e) => handleInputChange('whatsapp_group', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
            </div>
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
              onClick={() => onCancel?.()}
              className="flex-1"
            >
              Cancel
            </Button>
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
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

