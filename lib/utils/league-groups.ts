import type { Match } from "@/types/match"

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
    .map(([key, ms]) => {
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
