import type { Match, MatchFeed } from "@/types/match"
import {
  fetchFixturesFeed,
  fetchFixtureDetail,
  fetchOdds,
  fetchLiveOdds,
  fetchPrediction,
  fetchLiveFixtures,
  fetchInjuries,
  fetchHeadToHead,
  fetchAllStandings,
  fetchCoach,
  fetchTrophies,
  fetchTransfers,
  fetchSidelinedByTeam,
} from "@/lib/api-football/client"
import {
  mapFixtureToMatch,
  enrichWithOdds,
  enrichWithPrediction,
  enrichWithInjuries,
  enrichWithH2H,
  enrichWithLineup,
  enrichWithCoaches,
  enrichWithTrophies,
  enrichWithTransfers,
  enrichWithSidelined,
} from "@/lib/api-football/mapper"
import type { ApiFixture } from "@/lib/api-football/types"

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

  // Live fixtures override scheduled — logos + events already embedded
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

  // Enrich matches with odds — live first, then top 30 upcoming (API quota guard)
  const liveForOdds = matchesWithForm.filter((m) => m.status === "LIVE")
  const upcomingForOdds = matchesWithForm
    .filter((m) => m.status === "UPCOMING")
    .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime())
    .slice(0, 30)
  const oddsTargets = [...liveForOdds, ...upcomingForOdds]
  const oddsTargetIds = new Set(oddsTargets.map((m) => m.id))

  const oddsResults = await Promise.allSettled(
    oddsTargets.map((m) =>
      m.status === "LIVE" ? fetchLiveOdds(m.id) : fetchOdds(m.id)
    ),
  )
  const oddsMap = new Map<number, Parameters<typeof enrichWithOdds>[1]>()
  oddsTargets.forEach((m, i) => {
    const r = oddsResults[i]
    if (r.status === "fulfilled" && r.value) oddsMap.set(m.id, r.value)
  })

  const withOdds = matchesWithForm.map((match) => {
    if (!oddsTargetIds.has(match.id)) return match
    const odds = oddsMap.get(match.id)
    return odds ? enrichWithOdds(match, odds) : match
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

  // For live matches, also fetch lineups if available (embedded in fixture detail)
  const liveMatches = withOdds.filter((m) => m.status === "LIVE")
  const liveLineupResults = await Promise.allSettled(
    liveMatches.map((m) => fetchFixtureDetail(m.id)),
  )

  const lineupMap = new Map<number, ApiFixture>()
  liveMatches.forEach((m, i) => {
    const r = liveLineupResults[i]
    if (r.status === "fulfilled" && r.value) lineupMap.set(m.id, r.value)
  })

  const finalMatches = withOdds.map((match) => {
    let m = match
    const pred = predMap.get(m.id)
    if (pred) m = enrichWithPrediction(m, pred)

    // Enrich live matches with lineups from fixture detail
    const liveFixture = lineupMap.get(m.id)
    if (liveFixture?.lineups?.length) {
      m = enrichWithLineup(m, liveFixture.lineups)
    }

    return m
  })

  return {
    matches: finalMatches,
    fetchedAt: new Date().toISOString(),
    source: "api",
  }
}

export async function fetchMatchById(id: number): Promise<Match | null> {
  const fixture = await fetchFixtureDetail(id)
  if (!fixture) return null

  let match = mapFixtureToMatch(fixture)
  const homeTeamId = fixture.teams.home.id
  const awayTeamId = fixture.teams.away.id

  // Full enrichment in parallel — odds, predictions, injuries, H2H, lineups, coaches, trophies, transfers, sidelined
  const [
    oddsResult,
    predResult,
    injuriesResult,
    h2hResult,
    homeCoachResult,
    awayCoachResult,
    homeTrophiesResult,
    awayTrophiesResult,
    homeTransfersResult,
    awayTransfersResult,
    homeSidelinedResult,
    awaySidelinedResult,
  ] = await Promise.allSettled([
    match.status === "LIVE" ? fetchLiveOdds(id) : fetchOdds(id),
    fetchPrediction(id),
    fetchInjuries(id),
    fetchHeadToHead(homeTeamId, awayTeamId),
    fetchCoach(homeTeamId),
    fetchCoach(awayTeamId),
    fetchTrophies(homeTeamId),
    fetchTrophies(awayTeamId),
    fetchTransfers(homeTeamId),
    fetchTransfers(awayTeamId),
    fetchSidelinedByTeam(homeTeamId),
    fetchSidelinedByTeam(awayTeamId),
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
  if (h2hResult.status === "fulfilled" && h2hResult.value.length > 0 && (!match.h2h || match.h2h.length === 0)) {
    match = enrichWithH2H(match, h2hResult.value)
  }

  // Lineups embedded in fixture detail response
  if (fixture.lineups?.length) {
    match = enrichWithLineup(match, fixture.lineups)
  }

  const homeCoach = homeCoachResult.status === "fulfilled" ? homeCoachResult.value : null
  const awayCoach = awayCoachResult.status === "fulfilled" ? awayCoachResult.value : null
  match = enrichWithCoaches(match, homeCoach, awayCoach)

  const homeTrophies = homeTrophiesResult.status === "fulfilled" ? homeTrophiesResult.value : []
  const awayTrophies = awayTrophiesResult.status === "fulfilled" ? awayTrophiesResult.value : []
  match = enrichWithTrophies(match, homeTrophies, awayTrophies)

  const homeTransfers = homeTransfersResult.status === "fulfilled" ? homeTransfersResult.value : []
  const awayTransfers = awayTransfersResult.status === "fulfilled" ? awayTransfersResult.value : []
  match = enrichWithTransfers(match, homeTransfers, awayTransfers)

  const homeSidelined = homeSidelinedResult.status === "fulfilled" ? homeSidelinedResult.value : []
  const awaySidelined = awaySidelinedResult.status === "fulfilled" ? awaySidelinedResult.value : []
  match = enrichWithSidelined(match, homeSidelined, awaySidelined)

  return match
}
