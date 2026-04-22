import type { Match } from "@/types/match"

/**
 * Priority order for leagues — most followed/prestigious first.
 * Matches are case-insensitive substring matched.
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

function leaguePriorityIndex(league: string): number {
  const l = league.toLowerCase()
  const idx = LEAGUE_PRIORITY.findIndex((name) => l.includes(name.toLowerCase()))
  return idx === -1 ? LEAGUE_PRIORITY.length : idx
}

export function leaguePrioritySort(a: string, b: string): number {
  return leaguePriorityIndex(a) - leaguePriorityIndex(b) || a.localeCompare(b)
}

export interface LeagueGroup {
  league: string
  matches: Match[]
  priority: number
}

/**
 * Groups matches by league and sorts groups by priority order.
 * Within each group, original match order is preserved.
 */
export function groupByLeague(matches: Match[]): LeagueGroup[] {
  const map = new Map<string, Match[]>()

  for (const match of matches) {
    const key = match.league
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(match)
  }

  return Array.from(map.entries())
    .map(([league, ms]) => ({
      league,
      matches: ms,
      priority: leaguePriorityIndex(league),
    }))
    .sort((a, b) => a.priority - b.priority || a.league.localeCompare(b.league))
}
