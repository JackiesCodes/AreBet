import type { Match, MatchFeed } from "@/types/match"
import { premierLeagueMatches } from "./premier-league"
import { laLigaMatches } from "./la-liga"
import { serieAMatches } from "./serie-a"
import { bundesligaMatches } from "./bundesliga"
import { ligue1Matches } from "./ligue-1"

let cached: Match[] | null = null

/** Build the demo match feed (cached). */
export function buildDemoMatches(): Match[] {
  if (cached) return cached
  cached = [
    ...premierLeagueMatches(),
    ...laLigaMatches(),
    ...serieAMatches(),
    ...bundesligaMatches(),
    ...ligue1Matches(),
  ]
  return cached
}

/** Reset cache (used by simulation engine snapshot reset). */
export function resetDemoCache(): void {
  cached = null
}

export function getDemoMatchFeed(): MatchFeed {
  return {
    matches: buildDemoMatches(),
    fetchedAt: new Date().toISOString(),
    source: "demo",
  }
}
