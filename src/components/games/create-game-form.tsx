'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface Group {
  id: string
  name: string
}

interface CreateGameFormProps {
  groupId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreateGameForm({ groupId, onSuccess, onCancel }: CreateGameFormProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [formData, setFormData] = useState({
    group_id: groupId || '',
    name: '',
    description: '',
    game_date: '',
    game_time: '',
    location: '',
    price: '',
    total_tickets: '',
    admin_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) {
      fetchGroups()
    }
  }, [groupId])

  const fetchGroups = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .order('name')

      if (error) {
        console.error('Error fetching groups:', error)
        return
      }

      setGroups(data || [])
    } catch (err) {
      console.error('Error fetching groups:', err)
    }
  }

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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Create New Game
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Selection */}
          {!groupId && (
            <div>
              <label htmlFor="group_id" className="block text-sm font-medium text-gray-700 mb-1">
                Select Group *
              </label>
              <select
                id="group_id"
                value={formData.group_id}
                onChange={(e) => handleInputChange('group_id', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Choose a group...</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Game Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Game Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Central Park Pickup Game"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Describe the game, skill level, format, etc."
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="game_date" className="block text-sm font-medium text-gray-700 mb-1">
                Game Date *
              </label>
              <input
                id="game_date"
                type="date"
                value={formData.game_date}
                onChange={(e) => handleInputChange('game_date', e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="game_time" className="block text-sm font-medium text-gray-700 mb-1">
                Game Time *
              </label>
              <input
                id="game_time"
                type="time"
                value={formData.game_time}
                onChange={(e) => handleInputChange('game_time', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Central Park, Great Lawn"
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

          {/* Admin Password */}
          <div>
            <label htmlFor="admin_password" className="block text-sm font-medium text-gray-700 mb-1">
              Group Admin Password *
            </label>
            <input
              id="admin_password"
              type="password"
              value={formData.admin_password}
              onChange={(e) => handleInputChange('admin_password', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter group admin password"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the admin password for the selected group
            </p>
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
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Creating Game...' : 'Create Game'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
