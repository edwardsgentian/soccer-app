'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GroupManagementModal } from '@/components/groups/group-management-modal'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Calendar, Instagram, Globe, Component } from 'lucide-react'

interface Group {
  id: string
  name: string
  description: string
  tags: string[]
  instagram?: string
  website?: string
  whatsapp_group?: string
  created_at: string
  games?: Array<{
    id: string
    game_date: string
  }>
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
        .select(`
          *,
          organizer:players!created_by (
            id,
            name,
            photo_url
          ),
          games!inner (
            id,
            game_date
          )
        `)
        .gte('games.game_date', new Date().toISOString().split('T')[0])
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
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Soccer Groups
            </h1>
            <p className="text-gray-600">
              Find and join soccer groups in your area
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => setShowCreateModal(true)}
            >
              Create Group
            </Button>
          </div>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Component className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to create a soccer group in your area!
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
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
      <div className="h-32 bg-gray-50 flex items-center justify-center">
        <Component className="w-8 h-8 text-gray-400" />
      </div>

      <div className="p-6">
        {/* Group Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
        

        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {group.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Upcoming Games Count */}
        <div className="flex items-center text-gray-600 text-sm mb-4">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{group.games?.length || 0} upcoming games</span>
        </div>

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
          <Button 
            asChild
            variant="outline" 
            className="w-full" 
            size="sm"
          >
            <Link href={`/groups/${group.id}`}>
              View Group
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
