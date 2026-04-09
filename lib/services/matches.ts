import type { Match, MatchFeed } from "@/types/match"
import { buildDemoMatches } from "@/lib/demo/matches"
import { applySimulationTick } from "@/lib/simulation/engine"

/**
 * Decide whether to serve demo data or hit a real API.
 * Defaults to demo unless an API key is provided AND demo flag isn't true.
 */
export function shouldUseDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true") return true
  if (process.env.NEXT_PUBLIC_USE_DEMO_DATA === "false" && process.env.API_FOOTBALL_KEY) return false
  if (!process.env.API_FOOTBALL_KEY) return true
  return false
}

let liveMatches: Match[] | null = null

/**
 * Returns the latest match feed. Runs the demo data through the
 * simulation engine on each call.
 */
export async function fetchMatchFeed(): Promise<MatchFeed> {
  if (shouldUseDemoMode()) {
    if (!liveMatches) liveMatches = buildDemoMatches().map((m) => ({ ...m }))
    liveMatches = applySimulationTick(liveMatches)
    return {
      matches: liveMatches,
      fetchedAt: new Date().toISOString(),
      source: "demo",
    }
  }
  throw new Error("Real API integration not yet built. Set NEXT_PUBLIC_USE_DEMO_DATA=true to use demo mode.")
}

/** Find a single match by id (from the current feed). */
export async function fetchMatchById(id: number): Promise<Match | null> {
  const feed = await fetchMatchFeed()
  return feed.matches.find((m) => m.id === id) ?? null
}
