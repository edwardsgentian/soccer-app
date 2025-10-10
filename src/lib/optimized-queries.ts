import { supabase } from './supabase'

// Optimized query functions for better performance

export const fetchHomepageData = async () => {
  try {
    // Run both queries in parallel
    const [gamesResult, seasonsResult] = await Promise.allSettled([
      fetchOptimizedGames(6), // Limit to 6 games for homepage
      fetchOptimizedSeasons(3) // Limit to 3 seasons for homepage
    ])

    return {
      games: gamesResult.status === 'fulfilled' ? gamesResult.value : [],
      seasons: seasonsResult.status === 'fulfilled' ? seasonsResult.value : [],
      errors: {
        games: gamesResult.status === 'rejected' ? gamesResult.reason : null,
        seasons: seasonsResult.status === 'rejected' ? seasonsResult.reason : null
      }
    }
  } catch (error) {
    console.error('Error fetching homepage data:', error)
    return {
      games: [],
      seasons: [],
      errors: { games: error, seasons: error }
    }
  }
}

export const fetchOptimizedGames = async (limit: number = 20) => {
  try {
    // Use the same approach as the working games page
    const { data: games, error: gamesError } = await supabase
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
        )
      `)
      .gte('game_date', new Date().toISOString().split('T')[0])
      .order('game_date', { ascending: true })
      .limit(limit)

    if (gamesError) throw gamesError

    // For each game, fetch player data separately (same as games page)
    const gamesWithPlayerData = await Promise.all(
      (games || []).map(async (game) => {
        // First, fetch player data for individual game attendees
        let gameAttendeesWithPlayers = game.game_attendees || []
        if (game.game_attendees && game.game_attendees.length > 0) {
          try {
            const { data: gameAttendeesData, error: gameAttendeesError } = await supabase
              .from('game_attendees')
              .select(`
                id,
                player_id,
                payment_status,
                attendance_status,
                players (
                  name,
                  photo_url
                )
              `)
              .eq('game_id', game.id)

            if (!gameAttendeesError && gameAttendeesData) {
              gameAttendeesWithPlayers = gameAttendeesData.map(attendee => ({
                id: attendee.id,
                player_id: attendee.player_id,
                payment_status: attendee.payment_status,
                attendance_status: attendee.attendance_status,
                players: attendee.players || { name: 'Unknown Player' }
              }))
            }
          } catch (err) {
            console.error('Error fetching game attendees for game:', game.id, err)
          }
        }

        if (game.season_id) {
          try {
            // Fetch season attendees for this game's season
            const { data: seasonAttendees, error: seasonError } = await supabase
              .from('season_attendees')
              .select(`
                id,
                created_at,
                player_id,
                players (
                  name,
                  photo_url
                )
              `)
              .eq('season_id', game.season_id)

            if (!seasonError && seasonAttendees) {
              // Fetch season game attendance for this specific game
              const { data: seasonGameAttendance } = await supabase
                .from('season_game_attendance')
                .select('season_attendee_id, attendance_status')
                .eq('game_id', game.id)

              // Combine season attendees with their attendance status for this game
              const seasonAttendeesWithStatus = seasonAttendees.map(attendee => {
                const gameAttendance = seasonGameAttendance?.find(ga => ga.season_attendee_id === attendee.id)
                return {
                  id: attendee.id,
                  player_id: attendee.player_id,
                  payment_status: 'completed',
                  attendance_status: gameAttendance?.attendance_status || 'attending',
                  players: attendee.players || { name: 'Unknown Player' }
                }
              })

              // Combine individual game attendees with season attendees
              const allAttendees = [
                ...gameAttendeesWithPlayers,
                ...seasonAttendeesWithStatus
              ]

              // Remove duplicates based on player_id
              const uniqueAttendees = allAttendees.filter((attendee, index, self) =>
                index === self.findIndex(a => a.player_id === attendee.player_id)
              )

              // Create season_game_attendance structure with player data
              const seasonGameAttendanceWithPlayers = seasonAttendeesWithStatus.map(attendee => ({
                attendance_status: attendee.attendance_status,
                season_attendees: {
                  id: attendee.id,
                  player_id: attendee.player_id,
                  payment_status: attendee.payment_status,
                  players: attendee.players
                }
              }))

              return {
                ...game,
                game_attendees: uniqueAttendees,
                season_attendees: seasonAttendees,
                season_game_attendance: seasonGameAttendanceWithPlayers
              }
            }
          } catch (err) {
            console.error('Error fetching season attendees for game:', game.id, err)
          }
        }
        
        // For non-season games, return with processed individual attendees
        return {
          ...game,
          game_attendees: gameAttendeesWithPlayers
        }
      })
    )

    return gamesWithPlayerData
  } catch (error) {
    console.error('Error fetching optimized games:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }
}

export const fetchOptimizedSeasons = async (limit: number = 10) => {
  try {
    const { data: seasons, error } = await supabase
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
      .gte('first_game_date', new Date().toISOString().split('T')[0])
      .order('first_game_date', { ascending: true })
      .limit(limit)

    if (error) throw error
    return seasons || []
  } catch (error) {
    console.error('Error fetching optimized seasons:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }
}

// Cache management
const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

export const getCachedData = (key: string) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }
  cache.delete(key)
  return null
}

export const setCachedData = (key: string, data: unknown, ttl: number = 5 * 60 * 1000) => { // 5 minutes default
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

export const clearCache = () => {
  cache.clear()
}

// Optimized groups queries
export const fetchOptimizedGroups = async (page: number = 1, pageSize: number = 12) => {
  try {
    const offset = (page - 1) * pageSize
    
    // Step 1: Get total count and basic group data
    const [countResult, groupsResult] = await Promise.all([
      supabase
        .from('groups')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          tags,
          instagram,
          website,
          whatsapp_group,
          created_at,
          photo_url
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
    ])

    if (groupsResult.error) throw groupsResult.error
    
    const groups = groupsResult.data
    const totalCount = countResult.count || 0

    // Step 2: Get game data for these groups in batch
    const groupIds = groups?.map(group => group.id) || []
    const { data: gamesData } = await supabase
      .from('games')
      .select(`
        id,
        group_id,
        game_date,
        game_attendees (
          player_id
        )
      `)
      .in('group_id', groupIds)

    // Step 3: Get season data for these groups in batch
    const { data: seasonsData } = await supabase
      .from('seasons')
      .select(`
        id,
        group_id,
        season_attendees (
          player_id
        )
      `)
      .in('group_id', groupIds)

    // Step 4: Combine the data
    const groupsWithData = groups?.map(group => {
      const groupGames = gamesData?.filter(game => game.group_id === group.id) || []
      const groupSeasons = seasonsData?.filter(season => season.group_id === group.id) || []
      
      return {
        ...group,
        games: groupGames,
        seasons: groupSeasons
      }
    }) || []

    return {
      groups: groupsWithData,
      totalCount: totalCount,
      hasMore: offset + pageSize < totalCount
    }
  } catch (error) {
    console.error('Error fetching optimized groups:', error)
    throw error
  }
}

export const fetchGroupsData = async (page: number = 1, pageSize: number = 12) => {
  try {
    // Check cache first
    const cacheKey = `groups-page-${page}-${pageSize}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      return cachedData
    }

    // Fetch fresh data
    const result = await fetchOptimizedGroups(page, pageSize)
    
    // Cache the data for 2 minutes (groups change less frequently)
    setCachedData(cacheKey, result, 2 * 60 * 1000)
    
    return result
  } catch (error) {
    console.error('Error fetching groups data:', error)
    return {
      groups: [],
      totalCount: 0,
      hasMore: false
    }
  }
}

// Lightweight group detail query for fast initial loading
export const fetchGroupDetailData = async (groupId: string) => {
  try {
    // Check cache first
    const cacheKey = `group-detail-${groupId}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      return cachedData
    }

    // Fetch basic group data
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupError) {
      throw new Error('Group not found')
    }

    // Fetch game data with attendees (simplified to avoid 500 errors)
    const { data: gamesData, error: gamesError } = await supabase
      .from('games')
      .select(`
        *,
        game_attendees (
          player_id,
          payment_status
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
      .eq('group_id', groupId)
      .order('game_date', { ascending: true })

    if (gamesError) {
      console.error('Error fetching games:', gamesError)
    }

    // Fetch season data with attendees (simplified to avoid 500 errors)
    const { data: seasonsData, error: seasonsError } = await supabase
      .from('seasons')
      .select(`
        *,
        season_attendees (
          player_id,
          payment_status
        )
      `)
      .eq('group_id', groupId)
      .order('first_game_date', { ascending: true })

    if (seasonsError) {
      console.error('Error fetching seasons:', seasonsError)
    }

    // Get unique players count for display (lightweight query)
    const playerIds = new Set()
    
    // Get player IDs from game attendees
    if (gamesData && gamesData.length > 0) {
      const { data: gameAttendees } = await supabase
        .from('game_attendees')
        .select('player_id')
        .in('game_id', gamesData.map(game => game.id))
      
      gameAttendees?.forEach(attendee => playerIds.add(attendee.player_id))
    }
    
    // Get player IDs from season attendees
    if (seasonsData && seasonsData.length > 0) {
      const { data: seasonAttendees } = await supabase
        .from('season_attendees')
        .select('player_id')
        .in('season_id', seasonsData.map(season => season.id))
      
      seasonAttendees?.forEach(attendee => playerIds.add(attendee.player_id))
    }

    // Get basic player info for the unique players
    const playersArray = []
    if (playerIds.size > 0) {
      const { data: playersData } = await supabase
        .from('players')
        .select('id, name, photo_url')
        .in('id', Array.from(playerIds))
      
      playersArray.push(...(playersData || []))
    }

    // Return basic data without complex attendee processing
    const gamesWithPlayerData = gamesData || []



    const result = {
      group: groupData,
      games: gamesWithPlayerData,
      seasons: seasonsData || [],
      players: playersArray
    }


    // Cache for 3 minutes (group details change less frequently)
    setCachedData(cacheKey, result, 3 * 60 * 1000)
    
    return result
  } catch (error) {
    console.error('Error fetching group detail data:', error)
    throw error
  }
}

// Unified function to fetch games with full attendee data for all pages
export const fetchGamesWithAttendees = async (page: number = 1, pageSize: number = 20) => {
  try {
    const cacheKey = `games-with-attendees-${page}-${pageSize}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      return cachedData
    }

    const offset = (page - 1) * pageSize

    // First, get total count
    const { count: totalCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .gte('game_date', new Date().toISOString().split('T')[0])

    // Fetch games with all attendee data
    const { data: gamesData, error } = await supabase
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
      .gte('game_date', new Date().toISOString().split('T')[0])
      .order('game_date', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    const result = {
      games: gamesData || [],
      totalCount: totalCount || 0,
      hasMore: offset + pageSize < (totalCount || 0)
    }


    // Cache for 2 minutes
    setCachedData(cacheKey, result, 2 * 60 * 1000)
    
    return result
  } catch (error) {
    console.error('Error fetching games with attendees:', error)
    throw error
  }
}

// Separate function to fetch detailed game data when needed
export const fetchGameDetails = async (gameId: string) => {
  try {
    const cacheKey = `game-detail-${gameId}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      return cachedData
    }

    const { data: gameData, error } = await supabase
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

    if (error) throw error

    // Cache for 2 minutes
    setCachedData(cacheKey, gameData, 2 * 60 * 1000)
    
    return gameData
  } catch (error) {
    console.error('Error fetching game details:', error)
    throw error
  }
}
