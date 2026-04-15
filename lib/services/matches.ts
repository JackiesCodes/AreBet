import type { Match, MatchFeed } from "@/types/match"
import { buildDemoMatches } from "@/lib/demo/matches"
import { applySimulationTick } from "@/lib/simulation/engine"
import {
  fetchFixturesFeed,
  fetchFixtureDetail,
  fetchOdds,
  fetchPrediction,
  fetchLiveFixtures,
  fetchInjuries,
  fetchHeadToHead,
  fetchAllStandings,
} from "@/lib/api-football/client"
import {
  mapFixtureToMatch,
  enrichWithOdds,
  enrichWithPrediction,
  enrichWithInjuries,
  enrichWithH2H,
} from "@/lib/api-football/mapper"
import type { ApiFixture } from "@/lib/api-football/types"

export function shouldUseDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true") return true
  if (process.env.NEXT_PUBLIC_USE_DEMO_DATA === "false" && process.env.API_FOOTBALL_KEY) return false
  if (!process.env.API_FOOTBALL_KEY) return true
  return false
}

// Demo mode in-memory state
let liveMatches: Match[] | null = null

/** Build a teamId → last-5-form map from standings (non-critical, silently fails) */
async function buildFormMap(): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  try {
    const standings = await fetchAllStandings()
    for (const item of standings) {
      const group = item.league.standings[0] ?? []
      for (const row of group) {
        if (row.form) map.set(row.team.id, row.form)
      }
    }
  } catch {
    // Form data is supplementary — don't fail the feed
  }
  return map
}

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

  // Fetch fixtures + standings (for form) in parallel
  const [scheduled, live, formMap] = await Promise.all([
    fetchFixturesFeed().catch(() => [] as ApiFixture[]),
    fetchLiveFixtures().catch(() => [] as ApiFixture[]),
    buildFormMap(),
  ])

  // Keep a raw fixture map so we can look up teamIds later for form enrichment
  const rawFixtures = new Map<number, ApiFixture>()
  const matchMap = new Map<number, Match>()

  for (const f of scheduled) {
    rawFixtures.set(f.fixture.id, f)
    matchMap.set(f.fixture.id, mapFixtureToMatch(f))
  }

  // Live fixtures override scheduled — include all leagues globally
  for (const f of live) {
    rawFixtures.set(f.fixture.id, f)
    matchMap.set(f.fixture.id, mapFixtureToMatch(f))
  }

  // Apply form data from standings to all matches
  const matchesWithForm: Match[] = Array.from(matchMap.entries()).map(([id, match]) => {
    const fixture = rawFixtures.get(id)
    if (!fixture) return match
    const homeForm = formMap.get(fixture.teams.home.id) ?? ""
    const awayForm = formMap.get(fixture.teams.away.id) ?? ""
    if (!homeForm && !awayForm) return match
    return {
      ...match,
      home: { ...match.home, form: homeForm },
      away: { ...match.away, form: awayForm },
    }
  })

  // Enrich all matches with odds (paid tier — no cap)
  const oddsResults = await Promise.allSettled(
    matchesWithForm.map((m) => fetchOdds(m.id)),
  )
  const withOdds = matchesWithForm.map((match, i) => {
    const r = oddsResults[i]
    return r?.status === "fulfilled" && r.value ? enrichWithOdds(match, r.value) : match
  })

  // Pre-fetch predictions for the 20 soonest upcoming matches
  const upcomingForPreds = withOdds
    .filter((m) => m.status === "UPCOMING")
    .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime())
    .slice(0, 20)

  const predResults = await Promise.allSettled(
    upcomingForPreds.map((m) => fetchPrediction(m.id)),
  )

  const predMap = new Map<number, Parameters<typeof enrichWithPrediction>[1]>()
  upcomingForPreds.forEach((m, i) => {
    const r = predResults[i]
    if (r.status === "fulfilled" && r.value) predMap.set(m.id, r.value)
  })

  const finalMatches = withOdds.map((match) => {
    const pred = predMap.get(match.id)
    return pred ? enrichWithPrediction(match, pred) : match
  })

  return {
    matches: finalMatches,
    fetchedAt: new Date().toISOString(),
    source: "api",
  }
}

export async function fetchMatchById(id: number): Promise<Match | null> {
  if (shouldUseDemoMode()) {
    const feed = await fetchMatchFeed()
    return feed.matches.find((m) => m.id === id) ?? null
  }

  const fixture = await fetchFixtureDetail(id)
  if (!fixture) return null

  let match = mapFixtureToMatch(fixture)
  const homeTeamId = fixture.teams.home.id
  const awayTeamId = fixture.teams.away.id

  // Full enrichment: odds + prediction + injuries + H2H in parallel
  const [oddsResult, predResult, injuriesResult, h2hResult] = await Promise.allSettled([
    fetchOdds(id),
    fetchPrediction(id),
    fetchInjuries(id),
    fetchHeadToHead(homeTeamId, awayTeamId),
  ])

  if (oddsResult.status === "fulfilled" && oddsResult.value) {
    match = enrichWithOdds(match, oddsResult.value)
  }
  if (predResult.status === "fulfilled" && predResult.value) {
    match = enrichWithPrediction(match, predResult.value)
  }
  if (injuriesResult.status === "fulfilled" && injuriesResult.value.length > 0) {
    match = enrichWithInjuries(match, injuriesResult.value, homeTeamId)
  }
  if (
    h2hResult.status === "fulfilled" &&
    h2hResult.value.length > 0 &&
    (!match.h2h || match.h2h.length === 0)
  ) {
    match = enrichWithH2H(match, h2hResult.value)
  }

  return match
}
