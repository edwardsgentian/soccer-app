'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { GroupManagementModal } from '@/components/groups/group-management-modal'
import { Header } from '@/components/header'
import { CalendarClock, Component, Users } from 'lucide-react'
import Image from 'next/image'
import { useServerPagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { fetchGroupsData } from '@/lib/optimized-queries'

interface Group {
  id: string
  name: string
  description: string
  tags: string[]
  instagram?: string
  website?: string
  whatsapp_group?: string
  created_at: string
  photo_url?: string
  games?: Array<{
    id: string
    game_date: string
    game_attendees?: Array<{
      player_id: string
      players?: {
        name: string
        photo_url?: string
      }
    }>
  }>
  seasons?: Array<{
    id: string
    season_attendees?: Array<{
      player_id: string
    }>
  }>
}

export default function GroupsPage() {
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  
  // Use server-side pagination hook
  const pagination = useServerPagination({ pageSize: 12 })

  useEffect(() => {
    loadGroupsData()
  }, [pagination.currentPage, loadGroupsData])

  const loadGroupsData = async () => {
    try {
      setLoading(true)
      // Use optimized query with caching and pagination
      const result = await fetchGroupsData(pagination.currentPage, pagination.pageSize)
      
      setAllGroups(result.groups)
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)
    } catch (err) {
      console.error('Error fetching groups:', err)
      setAllGroups([])
    } finally {
      setLoading(false)
    }
  }

  const handleGroupCreated = () => {
    loadGroupsData() // Refresh the groups list
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="hero-h1 text-6xl font-medium text-gray-900 mb-2">
              Discover Groups
            </h1>
            <p className="text-gray-600">
              Find and join groups in your area
            </p>
          </div>
          <div className="flex justify-center">
            <LoadingButton 
              onClick={() => setShowCreateModal(true)}
              loading={creatingGroup}
              loadingText="Creating..."
            >
              Create Group
            </LoadingButton>
          </div>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading groups...</p>
          </div>
        ) : pagination.totalItems === 0 ? (
          <div className="text-center py-12">
            <Component className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to create a group in your area!
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
            >
              Create First Group
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
            
            {/* Pagination */}
            {Math.ceil(totalCount / pagination.pageSize) > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={Math.ceil(totalCount / pagination.pageSize)}
                  onPageChange={pagination.goToPage}
                  showPageSizeSelector={true}
                  pageSize={pagination.pageSize}
                  onPageSizeChange={pagination.setPageSize}
                  pageSizeOptions={[6, 12, 24, 48]}
                />
              </div>
            )}
          </>
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

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => window.location.href = `/groups/${group.id}`}
    >
        <div className="p-6 text-center">
          {/* Group Image - Same size as icons */}
          <div className="flex justify-center mb-4">
            {group.photo_url ? (
              <Image
                src={group.photo_url}
                alt={group.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded object-cover"
              />
            ) : (
              <Component className="w-16 h-16 text-gray-400" />
            )}
          </div>

          {/* Group Name */}
          <h3 className="text-xl font-bold text-gray-900 mb-4">{group.name}</h3>

          {/* Tags */}
          {group.tags && group.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {group.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-6">
            {/* Upcoming Games Count */}
            <div className="flex items-center text-gray-600 text-sm">
              <CalendarClock className="w-4 h-4 mr-2" />
              <span>{(() => {
                const today = new Date().toISOString().split('T')[0]
                return group.games?.filter(game => game.game_date >= today).length || 0
              })()}</span>
            </div>

            {/* Player Count */}
            <div className="flex items-center text-gray-600 text-sm">
              <Users className="w-4 h-4 mr-2" />
              <span>{(() => {
                const allPlayerIds = new Set<string>()
                // Add game attendees
                group.games?.forEach(game => {
                  game.game_attendees?.forEach(attendee => {
                    allPlayerIds.add(attendee.player_id)
                  })
                })
                // Add season attendees
                group.seasons?.forEach(season => {
                  season.season_attendees?.forEach(attendee => {
                    allPlayerIds.add(attendee.player_id)
                  })
                })
                return allPlayerIds.size
              })()}</span>
            </div>
          </div>
        </div>
    </div>
  )
}
