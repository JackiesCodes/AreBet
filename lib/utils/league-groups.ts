import type { Match } from "@/types/match"

/**
 * League popularity by API-Football league ID.
 * Used for ranking search results and sorting.
 * Single source of truth — import from here, don't duplicate.
 */
export const LEAGUE_POP: Record<number, number> = {
  2: 100, 3: 95, 848: 88,
  39: 90, 140: 90, 135: 90, 78: 90, 61: 90,
  1: 88, 4: 86, 5: 80, 6: 78, 10: 75,
  45: 78, 48: 76, 143: 74, 137: 74, 81: 74, 66: 74,
  94: 72, 88: 72, 144: 70, 207: 68,
  119: 65, 113: 65, 103: 65, 106: 65, 218: 64,
  13: 82, 11: 78, 71: 72, 73: 65, 128: 70, 239: 65,
  253: 68, 262: 64,
  169: 60, 188: 58, 17: 56,
}

export function leaguePop(id: number | null | undefined): number {
  return id ? (LEAGUE_POP[id] ?? 5) : 5
}

/**
 * Priority order for leagues — most followed/prestigious first.
 * Matches are case-insensitive substring matched against the display label.
 */
const LEAGUE_PRIORITY: string[] = [
  "UEFA Champions League",
  "UEFA Europa League",
  "UEFA Conference League",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Eredivisie",
  "Primeira Liga",
  "Süper Lig",
  "Pro League",
  "Scottish Premiership",
  "Championship",
  "Serie B",
  "2. Bundesliga",
  "Ligue 2",
  "Copa del Rey",
  "FA Cup",
  "Carabao Cup",
  "DFB Pokal",
  "Coppa Italia",
  "Coupe de France",
  "Brasileirão",
  "MLS",
  "Liga MX",
  "Argentine Primera",
]

function leaguePriorityIndex(label: string): number {
  const l = label.toLowerCase()
  const idx = LEAGUE_PRIORITY.findIndex((name) => l.includes(name.toLowerCase()))
  return idx === -1 ? LEAGUE_PRIORITY.length : idx
}

export function leaguePrioritySort(a: string, b: string): number {
  return leaguePriorityIndex(a) - leaguePriorityIndex(b) || a.localeCompare(b)
}

export interface LeagueGroup {
  league: string       // display label (may include country for disambiguation)
  leagueId: number | undefined
  matches: Match[]
  priority: number
}

/**
 * Groups matches by leagueId (not name) to prevent cross-country name collisions
 * (e.g. English "Premier League" vs Egyptian "Premier League").
 *
 * Display label is "League Name" normally, or "League Name · Country" when
 * multiple leagues share the same name.
 */
export function groupByLeague(matches: Match[]): LeagueGroup[] {
  // Key by leagueId when available, fall back to "name::country" to stay unique
  const map = new Map<string | number, Match[]>()

  for (const match of matches) {
    const key = match.leagueId != null ? match.leagueId : `${match.league}::${match.country}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(match)
  }

  // Detect which league names appear more than once (different countries)
  const nameCount = new Map<string, number>()
  for (const group of map.values()) {
    const name = group[0].league
    nameCount.set(name, (nameCount.get(name) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .map(([, ms]) => {
      const first = ms[0]
      const isDuplicate = (nameCount.get(first.league) ?? 0) > 1
      const label = isDuplicate && first.country
        ? `${first.league} · ${first.country}`
        : first.league
      return {
        league: label,
        leagueId: first.leagueId,
        matches: ms,
        priority: leaguePriorityIndex(label),
      }
    })
    .sort((a, b) => a.priority - b.priority || a.league.localeCompare(b.league))
}
