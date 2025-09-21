'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GroupManagementModal } from '@/components/groups/group-management-modal'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Calendar, Users, MapPin, Instagram, Globe } from 'lucide-react'

interface Group {
  id: string
  name: string
  description: string
  tags: string[]
  instagram?: string
  website?: string
  whatsapp_group?: string
  created_at: string
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching groups:', error)
        return
      }

      setGroups(data || [])
    } catch (err) {
      console.error('Error fetching groups:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGroupCreated = () => {
    fetchGroups() // Refresh the groups list
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Soccer Groups
            </h1>
            <p className="text-gray-600">
              Find and join soccer groups in your area
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Create Group
          </Button>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to create a soccer group in your area!
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              Create First Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>

      <GroupManagementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  )
}

function GroupCard({ group }: { group: Group }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Group Header */}
      <div className="h-32 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <span className="text-4xl text-white opacity-80">⚽</span>
      </div>

      <div className="p-6">
        {/* Group Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
        
        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {group.description}
        </p>

        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {group.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Social Links */}
        <div className="flex items-center gap-4 mb-4">
          {group.instagram && (
            <a
              href={`https://instagram.com/${group.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-600 hover:text-pink-600 transition-colors"
            >
              <Instagram className="w-4 h-4 mr-1" />
              <span className="text-sm">{group.instagram}</span>
            </a>
          )}
          {group.website && (
            <a
              href={group.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Globe className="w-4 h-4 mr-1" />
              <span className="text-sm">Website</span>
            </a>
          )}
        </div>

        {/* Created Date */}
        <div className="flex items-center text-gray-500 text-sm mb-4">
          <Calendar className="w-4 h-4 mr-1" />
          <span>Created {formatDate(group.created_at)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" size="sm">
            View Games
          </Button>
          {group.whatsapp_group && (
            <Button
              asChild
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <a
                href={group.whatsapp_group}
                target="_blank"
                rel="noopener noreferrer"
              >
                Join WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
