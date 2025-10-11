/**
 * Centralized Attendance Service
 * 
 * This service provides consistent data fetching for attendance across all views.
 * It handles the complexity of fetching player data separately to avoid 500 errors
 * while maintaining consistent data structures.
 * Updated to use proper TypeScript interfaces.
 */

import { supabase } from './supabase'

export interface Player {
  id: string
  name: string
  photo_url?: string
}

export interface GameAttendee {
  id: string
  player_id: string
  payment_status: string
  attendance_status?: 'attending' | 'not_attending'
  players?: Player
}

export interface SeasonAttendee {
  id: string
  player_id: string
  payment_status: string
  players?: Player
}

export interface SeasonGameAttendance {
  attendance_status: string
  season_attendees: SeasonAttendee
}

export interface SeasonGameAttendanceRaw {
  attendance_status: string
  season_attendees: {
    id: string
    player_id: string
    payment_status: string
  }[]
}

export interface SeasonAttendeeRaw {
  id: string
  player_id: string
  payment_status: string
}

export interface SeasonGameAttendanceFlexible {
  attendance_status: string
  season_attendees: SeasonAttendeeRaw | SeasonAttendeeRaw[] | null
}

export interface GameWithAttendance {
  id: string
  name: string
  game_date: string
  game_time: string
  location: string
  season_id?: string
  group_id: string
  price: number
  total_tickets: number
  available_tickets: number
  created_at: string
  game_attendees: GameAttendee[]
  season_game_attendance: SeasonGameAttendanceFlexible[]
  groups?: {
    name: string
    whatsapp_group?: string
  } | {
    name: string
    whatsapp_group?: string
  }[]
  seasons?: {
    id: string
    name: string
    season_signup_deadline?: string
  } | {
    id: string
    name: string
    season_signup_deadline?: string
  }[]
}

export interface SeasonWithAttendance {
  id: string
  name: string
  description?: string
  season_price: number
  individual_game_price: number
  total_games: number
  season_spots: number
  game_spots: number
  first_game_date: string
  first_game_time: string
  repeat_type: string
  location: string
  group_id: string
  season_attendees: SeasonAttendee[]
  groups?: {
    name: string
    whatsapp_group?: string
  } | {
    name: string
    whatsapp_group?: string
  }[]
}

/**
 * Fetches player data for a list of player IDs
 * This is done separately to avoid 500 errors from nested queries
 */
async function fetchPlayersData(playerIds: string[]): Promise<Map<string, Player>> {
  if (playerIds.length === 0) return new Map()

  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name, photo_url')
      .in('id', playerIds)

    if (error) {
      console.error('Error fetching players:', error)
      return new Map()
    }

    const playersMap = new Map<string, Player>()
    players?.forEach(player => {
      playersMap.set(player.id, {
        id: player.id,
        name: player.name,
        photo_url: player.photo_url
      })
    })

    return playersMap
  } catch (error) {
    console.error('Error in fetchPlayersData:', error)
    return new Map()
  }
}

/**
 * Enriches attendee data with player information
 */
function enrichAttendeesWithPlayers<T extends { player_id: string }>(
  attendees: T[],
  playersMap: Map<string, Player>
): (T & { players: Player })[] {
  return attendees.map(attendee => ({
    ...attendee,
    players: playersMap.get(attendee.player_id) || {
      id: attendee.player_id,
      name: 'Unknown Player',
      photo_url: undefined
    }
  }))
}

/**
 * Fetches games with attendance data and player information
 */
export async function fetchGamesWithAttendance(filters?: {
  groupId?: string
  seasonId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}): Promise<GameWithAttendance[]> {
  try {
    let query = supabase
      .from('games')
      .select(`
        id,
        name,
        game_date,
        game_time,
        location,
        season_id,
        group_id,
        price,
        total_tickets,
        available_tickets,
        created_at,
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
        ),
        groups (
          name,
          whatsapp_group
        ),
        seasons (
          id,
          name,
          season_signup_deadline
        )
      `)

    // Apply filters
    if (filters?.groupId) {
      query = query.eq('group_id', filters.groupId)
    }
    if (filters?.seasonId) {
      query = query.eq('season_id', filters.seasonId)
    }
    if (filters?.dateFrom) {
      query = query.gte('game_date', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('game_date', filters.dateTo)
    }

    // Apply ordering and pagination
    query = query.order('game_date', { ascending: true })
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data: games, error } = await query

    if (error) {
      console.error('Error fetching games:', error)
      return []
    }

    if (!games || games.length === 0) {
      return []
    }

    // Collect all unique player IDs
    const playerIds = new Set<string>()
    games.forEach(game => {
      // Add game attendees
      game.game_attendees?.forEach((attendee: GameAttendee) => {
        playerIds.add(attendee.player_id)
      })
      // Add season attendees
      game.season_game_attendance?.forEach((attendance: SeasonGameAttendanceFlexible) => {
        if (attendance.season_attendees) {
          if (Array.isArray(attendance.season_attendees)) {
            attendance.season_attendees.forEach((attendee: SeasonAttendeeRaw) => {
              playerIds.add(attendee.player_id)
            })
          } else {
            playerIds.add(attendance.season_attendees.player_id)
          }
        }
      })
    })

    // Fetch all player data in one query
    const playersMap = await fetchPlayersData(Array.from(playerIds))

    // Enrich games with player data
    const enrichedGames = games.map(game => ({
      ...game,
      game_attendees: enrichAttendeesWithPlayers(
        game.game_attendees || [],
        playersMap
      ),
      season_game_attendance: (game.season_game_attendance || []).map((attendance: SeasonGameAttendanceFlexible) => ({
        ...attendance,
        season_attendees: Array.isArray(attendance.season_attendees) 
          ? attendance.season_attendees.map((attendee: SeasonAttendeeRaw) => ({
              ...attendee,
              players: playersMap.get(attendee.player_id) || {
                id: attendee.player_id,
                name: 'Unknown Player',
                photo_url: undefined
              }
            }))
          : attendance.season_attendees ? {
              ...attendance.season_attendees,
              players: playersMap.get(attendance.season_attendees.player_id) || {
                id: attendance.season_attendees.player_id,
                name: 'Unknown Player',
                photo_url: undefined
              }
            } : null
      }))
    }))

    return enrichedGames
  } catch (error) {
    console.error('Error in fetchGamesWithAttendance:', error)
    return []
  }
}

/**
 * Fetches seasons with attendance data and player information
 */
export async function fetchSeasonsWithAttendance(filters?: {
  groupId?: string
  dateFrom?: string
  limit?: number
  offset?: number
}): Promise<SeasonWithAttendance[]> {
  console.log('fetchSeasonsWithAttendance called with filters:', filters)
  try {
    let query = supabase
      .from('seasons')
      .select(`
        id,
        name,
        description,
        season_price,
        individual_game_price,
        total_games,
        season_spots,
        game_spots,
        first_game_date,
        first_game_time,
        repeat_type,
        location,
        group_id,
        season_attendees (
          id,
          player_id,
          payment_status
        ),
        groups (
          name,
          whatsapp_group
        )
      `)

    // Apply filters
    if (filters?.groupId) {
      query = query.eq('group_id', filters.groupId)
    }
    if (filters?.dateFrom) {
      query = query.gte('first_game_date', filters.dateFrom)
    }

    // Apply ordering and pagination
    query = query.order('first_game_date', { ascending: true })
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data: seasons, error } = await query

    if (error) {
      console.error('Error fetching seasons:', error)
      return []
    }

    console.log('Raw seasons data from database:', {
      seasonsCount: seasons?.length || 0,
      seasons: seasons?.map(s => ({
        id: s.id,
        name: s.name,
        first_game_date: s.first_game_date,
        seasonAttendeesCount: s.season_attendees?.length || 0
      }))
    })

    if (!seasons || seasons.length === 0) {
      return []
    }

    // Collect all unique player IDs
    const playerIds = new Set<string>()
    seasons.forEach(season => {
      season.season_attendees?.forEach((attendee: SeasonAttendee) => {
        playerIds.add(attendee.player_id)
      })
    })

    // Fetch all player data in one query
    const playersMap = await fetchPlayersData(Array.from(playerIds))

    // Enrich seasons with player data
    const enrichedSeasons = seasons.map(season => ({
      ...season,
      season_attendees: enrichAttendeesWithPlayers(
        season.season_attendees || [],
        playersMap
      )
    }))

    console.log('Enriched seasons data:', {
      enrichedSeasonsCount: enrichedSeasons.length,
      enrichedSeasons: enrichedSeasons.map(s => ({
        id: s.id,
        name: s.name,
        seasonAttendeesCount: s.season_attendees?.length || 0,
        seasonAttendees: s.season_attendees
      }))
    })

    return enrichedSeasons
  } catch (error) {
    console.error('Error in fetchSeasonsWithAttendance:', error)
    return []
  }
}

/**
 * Checks if a user is attending a specific game
 */
export function isUserAttendingGame(
  game: GameWithAttendance,
  userId: string
): { isAttending: boolean; hasPaid: boolean; attendanceStatus?: string } {
  // Check individual game attendance
  const individualAttendee = game.game_attendees?.find(
    attendee => attendee.player_id === userId && attendee.payment_status === 'completed'
  )

  if (individualAttendee) {
    return {
      isAttending: individualAttendee.attendance_status === 'attending' || !individualAttendee.attendance_status,
      hasPaid: true,
      attendanceStatus: individualAttendee.attendance_status
    }
  }

  // Check season attendance
  const seasonAttendee = game.season_game_attendance?.find(
    attendance => attendance.season_attendees?.player_id === userId && 
                 attendance.season_attendees?.payment_status === 'completed'
  )

  if (seasonAttendee) {
    return {
      isAttending: seasonAttendee.attendance_status === 'attending' || !seasonAttendee.attendance_status,
      hasPaid: true,
      attendanceStatus: seasonAttendee.attendance_status
    }
  }

  return { isAttending: false, hasPaid: false }
}

/**
 * Checks if a user is attending a specific season
 */
export function isUserAttendingSeason(
  season: SeasonWithAttendance,
  userId: string
): { isAttending: boolean; hasPaid: boolean } {
  const attendee = season.season_attendees?.find(
    attendee => attendee.player_id === userId && attendee.payment_status === 'completed'
  )

  return {
    isAttending: !!attendee,
    hasPaid: !!attendee
  }
}

/**
 * Gets the total unique player count for a game (including both individual and season attendees)
 */
export function getGamePlayerCount(game: GameWithAttendance): number {
  const playerIds = new Set<string>()
  
  // Add individual attendees
  game.game_attendees?.forEach(attendee => {
    if (attendee.payment_status === 'completed') {
      playerIds.add(attendee.player_id)
    }
  })
  
  // Add season attendees
  game.season_game_attendance?.forEach(attendance => {
    if (attendance.season_attendees?.payment_status === 'completed') {
      playerIds.add(attendance.season_attendees.player_id)
    }
  })
  
  return playerIds.size
}

/**
 * Gets the total unique player count for a season
 */
export function getSeasonPlayerCount(season: SeasonWithAttendance): number {
  const playerIds = new Set<string>()
  
  season.season_attendees?.forEach(attendee => {
    if (attendee.payment_status === 'completed') {
      playerIds.add(attendee.player_id)
    }
  })
  
  return playerIds.size
}
