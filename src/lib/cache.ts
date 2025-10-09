interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number // Default TTL in milliseconds
  maxSize?: number // Maximum number of items in cache
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes
  private maxSize = 200 // Increased cache size
  private prefetchQueue = new Set<string>() // Track prefetched items

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL
    this.maxSize = options.maxSize || this.maxSize
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }

  // Clean expired items
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Prefetch data if not already cached
  async prefetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<void> {
    if (this.has(key) || this.prefetchQueue.has(key)) {
      return // Already cached or being prefetched
    }

    this.prefetchQueue.add(key)
    try {
      const data = await fetcher()
      this.set(key, data, ttl)
    } catch (error) {
      console.warn(`Failed to prefetch ${key}:`, error)
    } finally {
      this.prefetchQueue.delete(key)
    }
  }

  // Get with fallback fetcher
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T | null> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    try {
      const data = await fetcher()
      this.set(key, data, ttl)
      return data
    } catch (error) {
      console.error(`Failed to fetch ${key}:`, error)
      return null
    }
  }

  // Batch prefetch multiple items
  async prefetchBatch<T>(
    items: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number }>
  ): Promise<void> {
    const promises = items.map(({ key, fetcher, ttl }) => 
      this.prefetch(key, fetcher, ttl)
    )
    await Promise.allSettled(promises)
  }
}

// Create cache instances for different data types with more aggressive caching
export const gameCache = new CacheManager({ 
  ttl: 5 * 60 * 1000, // 5 minutes for games (increased from 2)
  maxSize: 100 // Increased cache size
})

export const groupCache = new CacheManager({ 
  ttl: 10 * 60 * 1000, // 10 minutes for groups (increased from 5)
  maxSize: 50 // Increased cache size
})

export const seasonCache = new CacheManager({ 
  ttl: 8 * 60 * 1000, // 8 minutes for seasons (increased from 3)
  maxSize: 50 // Increased cache size
})

export const playerCache = new CacheManager({ 
  ttl: 15 * 60 * 1000, // 15 minutes for player data (increased from 10)
  maxSize: 200 // Increased cache size
})

// Cache key generators
export const cacheKeys = {
  games: (filters?: { date?: string; limit?: number }) => 
    `games:${JSON.stringify(filters || {})}`,
  
  game: (id: string) => `game:${id}`,
  
  groups: (filters?: { limit?: number }) => 
    `groups:${JSON.stringify(filters || {})}`,
  
  group: (id: string) => `group:${id}`,
  
  seasons: (filters?: { date?: string; limit?: number }) => 
    `seasons:${JSON.stringify(filters || {})}`,
  
  season: (id: string) => `season:${id}`,
  
  player: (id: string) => `player:${id}`,
  
  gameAttendees: (gameId: string) => `game-attendees:${gameId}`,
  
  seasonAttendees: (seasonId: string) => `season-attendees:${seasonId}`
}

// Utility function to invalidate related cache entries
export const invalidateRelatedCache = (type: 'game' | 'group' | 'season' | 'player', id?: string) => {
  switch (type) {
    case 'game':
      gameCache.delete(cacheKeys.game(id!))
      gameCache.clear() // Clear all games cache as they might be affected
      break
    case 'group':
      groupCache.delete(cacheKeys.group(id!))
      groupCache.clear() // Clear all groups cache
      break
    case 'season':
      seasonCache.delete(cacheKeys.season(id!))
      seasonCache.clear() // Clear all seasons cache
      break
    case 'player':
      playerCache.delete(cacheKeys.player(id!))
      // Don't clear all player cache as it's less likely to affect others
      break
  }
}

// Auto-cleanup expired items every 5 minutes
setInterval(() => {
  gameCache.cleanup()
  groupCache.cleanup()
  seasonCache.cleanup()
  playerCache.cleanup()
}, 5 * 60 * 1000)
