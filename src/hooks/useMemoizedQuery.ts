import { useState, useEffect, useCallback, useRef } from 'react'
import { gameCache, groupCache, seasonCache, playerCache, cacheKeys } from '@/lib/cache'

interface QueryOptions {
  enabled?: boolean
  staleTime?: number // Time before data is considered stale
  cacheTime?: number // Time to keep data in cache
  refetchOnWindowFocus?: boolean
}

interface QueryResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isStale: boolean
}

export function useMemoizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    staleTime = 2 * 60 * 1000, // 2 minutes
    cacheTime = 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus = false
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  
  const lastFetchTime = useRef<number>(0)

  const getCache = useCallback(() => {
    if (queryKey.startsWith('games:')) return gameCache
    if (queryKey.startsWith('game:')) return gameCache
    if (queryKey.startsWith('groups:')) return groupCache
    if (queryKey.startsWith('group:')) return groupCache
    if (queryKey.startsWith('seasons:')) return seasonCache
    if (queryKey.startsWith('season:')) return seasonCache
    if (queryKey.startsWith('player:')) return playerCache
    return gameCache // default
  }, [queryKey])

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return

    const cache = getCache()
    const cachedData = cache.get<T>(queryKey)
    
    // Check if we have cached data and it's not stale
    if (cachedData && !force) {
      const timeSinceFetch = Date.now() - lastFetchTime.current
      if (timeSinceFetch < staleTime) {
        setData(cachedData)
        setLoading(false)
        setError(null)
        setIsStale(false)
        return
      } else {
        // Data is stale, show cached data but mark as stale
        setData(cachedData)
        setIsStale(true)
      }
    }

    // If we have stale data, show it while fetching fresh data
    if (cachedData && isStale) {
      setLoading(true)
    } else if (!cachedData) {
      setLoading(true)
    }

    try {
      const result = await queryFn()
      
      // Cache the result
      cache.set(queryKey, result, cacheTime)
      
      setData(result)
      setError(null)
      setIsStale(false)
      lastFetchTime.current = Date.now()
    } catch (err) {
      setError(err as Error)
      // If we have cached data, keep showing it even on error
      if (!cachedData) {
        setData(null)
      }
    } finally {
      setLoading(false)
    }
  }, [queryKey, queryFn, enabled, staleTime, cacheTime, getCache, isStale])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [fetchData, enabled])

  // Handle window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      if (isStale) {
        refetch()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnWindowFocus, isStale, refetch])

  return {
    data,
    loading,
    error,
    refetch,
    isStale
  }
}

// Specialized hooks for different data types
export function useMemoizedGames(filters?: { date?: string; limit?: number }) {
  return useMemoizedQuery(
    cacheKeys.games(filters),
    async () => {
      // This will be implemented in the actual query functions
      throw new Error('useMemoizedGames query function not implemented')
    },
    { staleTime: 2 * 60 * 1000 }
  )
}

export function useMemoizedGame(gameId: string) {
  return useMemoizedQuery(
    cacheKeys.game(gameId),
    async () => {
      // This will be implemented in the actual query functions
      throw new Error('useMemoizedGame query function not implemented')
    },
    { staleTime: 1 * 60 * 1000 }
  )
}

export function useMemoizedGroups(filters?: { limit?: number }) {
  return useMemoizedQuery(
    cacheKeys.groups(filters),
    async () => {
      // This will be implemented in the actual query functions
      throw new Error('useMemoizedGroups query function not implemented')
    },
    { staleTime: 5 * 60 * 1000 }
  )
}

export function useMemoizedGroup(groupId: string) {
  return useMemoizedQuery(
    cacheKeys.group(groupId),
    async () => {
      // This will be implemented in the actual query functions
      throw new Error('useMemoizedGroup query function not implemented')
    },
    { staleTime: 3 * 60 * 1000 }
  )
}
