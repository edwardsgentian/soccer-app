'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

interface CreateGameFormProps {
  groupId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreateGameForm({ groupId, onSuccess, onCancel }: CreateGameFormProps) {
  const { player } = useAuth()
  const [formData, setFormData] = useState({
    group_id: groupId,
    name: '',
    description: '',
    game_date: '',
    game_time: '',
    location: '',
    price: '',
    total_tickets: '',
    duration_hours: '2.0',
    admin_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group is always provided from group page context


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // Verify admin password
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('admin_password')
        .eq('id', formData.group_id)
        .single()

      if (groupError) {
        throw new Error('Group not found')
      }

      // Simple password verification (in production, use proper hashing)
      const hashedPassword = btoa(formData.admin_password)
      if (groupData.admin_password !== hashedPassword) {
        throw new Error('Invalid admin password')
      }

      // Create the game
      const { error } = await supabase
        .from('games')
        .insert({
          group_id: formData.group_id,
          name: formData.name,
          description: formData.description,
          game_date: formData.game_date,
          game_time: formData.game_time,
          location: formData.location,
          price: parseFloat(formData.price),
          total_tickets: parseInt(formData.total_tickets),
          available_tickets: parseInt(formData.total_tickets),
          duration_hours: parseFloat(formData.duration_hours),
          created_by: player?.id || null,
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
      <div className="p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Create Game
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Game Name */}
          <div>
            <label htmlFor="name" className="block text-lg font-medium text-gray-900 mb-3">
              Game Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-lg"
              placeholder="e.g., Central Park Pickup Game"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-lg font-medium text-gray-900 mb-3">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-lg"
              placeholder="Describe the game, skill level, format, etc."
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="game_date" className="block text-lg font-medium text-gray-900 mb-3">
                Start
              </label>
              <input
                id="game_date"
                type="date"
                value={formData.game_date}
                onChange={(e) => handleInputChange('game_date', e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-lg"
              />
            </div>

            <div>
              <label htmlFor="game_time" className="block text-lg font-medium text-gray-900 mb-3">
                Time
              </label>
              <input
                id="game_time"
                type="time"
                value={formData.game_time}
                onChange={(e) => handleInputChange('game_time', e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-lg"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-lg font-medium text-gray-900 mb-3">
              Add Event Location
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-lg"
              placeholder="Offline location or virtual link"
            />
          </div>

          {/* Price and Tickets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price per Player ($) *
              </label>
              <input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="15.00"
              />
            </div>

            <div>
              <label htmlFor="total_tickets" className="block text-sm font-medium text-gray-700 mb-1">
                Total Tickets *
              </label>
              <input
                id="total_tickets"
                type="number"
                value={formData.total_tickets}
                onChange={(e) => handleInputChange('total_tickets', e.target.value)}
                required
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="12"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration_hours" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (hours) *
            </label>
            <input
              id="duration_hours"
              type="number"
              value={formData.duration_hours}
              onChange={(e) => handleInputChange('duration_hours', e.target.value)}
              required
              min="0.5"
              max="8"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="2.0"
            />
          </div>

          {/* Admin Password */}
          <div>
            <label htmlFor="admin_password" className="block text-lg font-medium text-gray-900 mb-3">
              Group Admin Password
            </label>
            <input
              id="admin_password"
              type="password"
              value={formData.admin_password}
              onChange={(e) => handleInputChange('admin_password', e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-lg"
              placeholder="Enter group admin password"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium rounded-lg transition-all duration-200"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
