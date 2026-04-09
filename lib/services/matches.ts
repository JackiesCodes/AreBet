import type { Match, MatchFeed } from "@/types/match"
import { buildDemoMatches } from "@/lib/demo/matches"
import { applySimulationTick } from "@/lib/simulation/engine"
import {
  fetchFixturesFeed,
  fetchFixtureDetail,
  fetchOdds,
  fetchPrediction,
  fetchLiveFixtures,
} from "@/lib/api-football/client"
import {
  mapFixtureToMatch,
  enrichWithOdds,
  enrichWithPrediction,
} from "@/lib/api-football/mapper"

export function shouldUseDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true") return true
  if (process.env.NEXT_PUBLIC_USE_DEMO_DATA === "false" && process.env.API_FOOTBALL_KEY) return false
  if (!process.env.API_FOOTBALL_KEY) return true
  return false
}

// Demo mode in-memory state
let liveMatches: Match[] | null = null

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

  // Real API mode: fetch scheduled + live fixtures
  const [scheduled, live] = await Promise.allSettled([
    fetchFixturesFeed(),
    fetchLiveFixtures(),
  ])

  const fixtureMap = new Map<number, Match>()

  if (scheduled.status === "fulfilled") {
    for (const f of scheduled.value) {
      fixtureMap.set(f.fixture.id, mapFixtureToMatch(f))
    }
  }

  // Live fixtures override scheduled (fresher data)
  if (live.status === "fulfilled") {
    for (const f of live.value) {
      fixtureMap.set(f.fixture.id, mapFixtureToMatch(f))
    }
  }

  const matches = Array.from(fixtureMap.values())

  // Enrich first 10 matches with odds (stays within free tier rate limits)
  const enrichTargets = matches.slice(0, 10)
  const oddsResults = await Promise.allSettled(
    enrichTargets.map((m) => fetchOdds(m.id)),
  )

  const enriched = matches.map((match, i) => {
    if (i < enrichTargets.length) {
      const result = oddsResults[i]
      if (result.status === "fulfilled" && result.value) {
        return enrichWithOdds(match, result.value)
      }
    }
    return match
  })

  return {
    matches: enriched,
    fetchedAt: new Date().toISOString(),
    source: "api",
  }
}

export async function fetchMatchById(id: number): Promise<Match | null> {
  if (shouldUseDemoMode()) {
    const feed = await fetchMatchFeed()
    return feed.matches.find((m) => m.id === id) ?? null
  }

  // Full detail fetch: events, stats, lineups
  const fixture = await fetchFixtureDetail(id)
  if (!fixture) return null

  let match = mapFixtureToMatch(fixture)

  // Enrich with odds + prediction in parallel
  const [oddsResult, predResult] = await Promise.allSettled([
    fetchOdds(id),
    fetchPrediction(id),
  ])

  if (oddsResult.status === "fulfilled" && oddsResult.value) {
    match = enrichWithOdds(match, oddsResult.value)
  }

  if (predResult.status === "fulfilled" && predResult.value) {
    match = enrichWithPrediction(match, predResult.value)
  }

  return match
}
