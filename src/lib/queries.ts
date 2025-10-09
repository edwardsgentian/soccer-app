import { supabase } from './supabase'
import { gameCache, groupCache, seasonCache, playerCache, cacheKeys, invalidateRelatedCache } from './cache'

// Game Queries
export async function fetchGames(filters?: { 
  date?: string; 
  limit?: number; 
  offset?: number;
  groupId?: string;
}) {
  const cacheKey = cacheKeys.games(filters)
  const cached = gameCache.get(cacheKey)
  
  if (cached) {
    return { data: cached, error: null }
  }

  try {
    let query = supabase
      .from('games')
      .select(`
        *,
        groups (
          name,
          whatsapp_group
        ),
        seasons (
          id,
          season_signup_deadline
        ),
        game_attendees (
          id,
          player_id,
          payment_status,
          attendance_status
        ),
        season_game_attendance (
          attendance_status,
          season_attendees (
            id,
            player_id,
            payment_status
          )
        )
      `)

    if (filters?.date) {
      query = query.gte('game_date', filters.date)
    }

    if (filters?.groupId) {
      query = query.eq('group_id', filters.groupId)
    }

    query = query.order('game_date', { ascending: true })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query

    if (!error && data) {
      // Cache the result for 2 minutes
      gameCache.set(cacheKey, data, 2 * 60 * 1000)
    }

    return { data, error }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function fetchGame(gameId: string) {
  const cacheKey = cacheKeys.game(gameId)
  const cached = gameCache.get(cacheKey)
  
  if (cached) {
    return { data: cached, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        groups (
          id,
          name,
          whatsapp_group
        ),
        seasons (
          id,
          season_signup_deadline,
          include_organizer_in_count
        ),
        game_attendees (
          id,
          player_id,
          payment_status,
          attendance_status,
          players (
            name,
            photo_url
          )
        ),
        season_game_attendance (
          attendance_status,
          season_attendees (
            id,
            player_id,
            payment_status,
            players (
              name,
              photo_url
            )
          )
        )
      `)
      .eq('id', gameId)
      .single()

    if (!error && data) {
      // Cache the result for 3 minutes
      gameCache.set(cacheKey, data, 3 * 60 * 1000)
    }

    return { data, error }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

// Group Queries
export async function fetchGroups(filters?: { limit?: number; offset?: number }) {
  const cacheKey = cacheKeys.groups(filters)
  const cached = groupCache.get(cacheKey)
  
  if (cached) {
    return { data: cached, error: null }
  }

  try {
    let query = supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        tags,
        photo_url,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query

    if (!error && data) {
      // Cache the result for 5 minutes
      groupCache.set(cacheKey, data, 5 * 60 * 1000)
    }

    return { data, error }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function fetchGroup(groupId: string) {
  const cacheKey = cacheKeys.group(groupId)
  const cached = groupCache.get(cacheKey)
  
  if (cached) {
    return { data: cached, error: null }
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
        )
      `)
      .eq('id', groupId)
      .single()

    if (!error && data) {
      // Cache the result for 5 minutes
      groupCache.set(cacheKey, data, 5 * 60 * 1000)
    }

    return { data, error }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

// Season Queries
export async function fetchSeasons(filters?: { 
  date?: string; 
  limit?: number; 
  offset?: number;
  groupId?: string;
}) {
  const cacheKey = cacheKeys.seasons(filters)
  const cached = seasonCache.get(cacheKey)
  
  if (cached) {
    return { data: cached, error: null }
  }

  try {
    let query = supabase
      .from('seasons')
      .select(`
        *,
        groups (
          name,
          whatsapp_group
        ),
        season_attendees (
          id,
          player_id,
          payment_status,
          players (
            name,
            photo_url
          )
        )
      `)

    if (filters?.date) {
      query = query.gte('first_game_date', filters.date)
    }

    if (filters?.groupId) {
      query = query.eq('group_id', filters.groupId)
    }

    query = query.order('first_game_date', { ascending: true })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query

    if (!error && data) {
      // Cache the result for 3 minutes
      seasonCache.set(cacheKey, data, 3 * 60 * 1000)
    }

    return { data, error }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function fetchSeason(seasonId: string) {
  const cacheKey = cacheKeys.season(seasonId)
  const cached = seasonCache.get(cacheKey)
  
  if (cached) {
    return { data: cached, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('seasons')
      .select(`
        *,
        groups (
          id,
          name,
          whatsapp_group
        ),
        season_attendees (
          id,
          player_id,
          payment_status,
          players (
            name,
            photo_url
          )
        )
      `)
      .eq('id', seasonId)
      .single()

    if (!error && data) {
      // Cache the result for 5 minutes
      seasonCache.set(cacheKey, data, 5 * 60 * 1000)
    }

    return { data, error }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

// Player Queries
export async function fetchPlayer(playerId: string) {
  const cacheKey = cacheKeys.player(playerId)
  const cached = playerCache.get(cacheKey)
  
  if (cached) {
    return { data: cached, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (!error && data) {
      // Cache the result for 10 minutes
      playerCache.set(cacheKey, data, 10 * 60 * 1000)
    }

    return { data, error }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

// Cache invalidation helpers
export function invalidateGameCache(gameId?: string) {
  if (gameId) {
    invalidateRelatedCache('game', gameId)
  } else {
    gameCache.clear()
  }
}

export function invalidateGroupCache(groupId?: string) {
  if (groupId) {
    invalidateRelatedCache('group', groupId)
  } else {
    groupCache.clear()
  }
}

export function invalidateSeasonCache(seasonId?: string) {
  if (seasonId) {
    invalidateRelatedCache('season', seasonId)
  } else {
    seasonCache.clear()
  }
}

export function invalidatePlayerCache(playerId?: string) {
  if (playerId) {
    invalidateRelatedCache('player', playerId)
  } else {
    playerCache.clear()
  }
}
