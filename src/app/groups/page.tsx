'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { GroupManagementModal } from '@/components/groups/group-management-modal'
import { Header } from '@/components/header'
import { Component } from 'lucide-react'
import { useServerPagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { fetchGroupsData } from '@/lib/optimized-queries'
import { GroupCard } from '@/components/group-card'

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
  const [creatingGroup, setCreatingGroup] = useState(false)
  
  // Use server-side pagination hook
  const pagination = useServerPagination({ pageSize: 12 })

  const loadGroupsData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )
      
      // Use optimized query with caching and pagination
      const result = await Promise.race([
        fetchGroupsData(pagination.currentPage, pagination.pageSize),
        timeoutPromise
      ]) as { groups: Group[]; totalCount: number }
      
      setAllGroups(result.groups)
      setTotalCount(result.totalCount)
    } catch (err) {
      console.error('Error fetching groups:', err)
      setAllGroups([])
    } finally {
      setLoading(false)
    }
  }, [pagination.currentPage, pagination.pageSize])

  useEffect(() => {
    loadGroupsData()
  }, [loadGroupsData])

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
              onClick={() => {
                setCreatingGroup(true)
                setShowCreateModal(true)
              }}
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
        ) : totalCount === 0 ? (
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
        onClose={() => {
          setShowCreateModal(false)
          setCreatingGroup(false)
        }}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  )
}

