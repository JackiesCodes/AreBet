import type {
  ApiResponse,
  ApiFixture,
  ApiOddsFixture,
  ApiPredictionFixture,
  ApiStandingResponse,
  ApiInjury,
  ApiPlayerStat,
  ApiTransfer,
  ApiSidelined,
  ApiTeam,
  ApiTeamSeasonStats,
  ApiCoach,
  ApiTrophy,
  ApiLeague,
  ApiCountry,
  ApiVenueResult,
} from "./types"

const BASE_URL = "https://v3.football.api-sports.io"

// ── Revalidation windows (Next.js Data Cache — survives serverless cold starts) ──
const REVALIDATE_LIVE     = 15          // live fixture scores/events
const REVALIDATE_FEED     = 60          // scheduled/recent fixture feed
const REVALIDATE_ODDS     = 60          // pre-match odds (change slowly pre-kick)
const REVALIDATE_ODDS_LIVE = 20         // in-play odds (change fast during play)
const REVALIDATE_PRED     = 60 * 60     // predictions (1 hr — rarely change)
const REVALIDATE_STANDINGS = 5 * 60    // standings (5 min — updates after goals)
const REVALIDATE_PLAYERS  = 24 * 60 * 60 // top scorers / transfers (1 day)
const REVALIDATE_DETAIL   = 2 * 60     // match detail / stats (2 min)

// Rate limit tracking — updated from response headers on every live fetch
let _rateLimitRemaining: number | null = null
let _rateLimitTotal: number | null = null

export function getRateLimitStatus(): { remaining: number | null; total: number | null } {
  return { remaining: _rateLimitRemaining, total: _rateLimitTotal }
}

function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) throw new Error("API_FOOTBALL_KEY is not set")
  return key
}

/**
 * Core fetch wrapper.
 * Uses Next.js Data Cache (`next: { revalidate }`) which:
 *  - persists across Vercel serverless invocations (shared edge cache)
 *  - deduplicates concurrent requests to the same URL
 *  - respects the revalidate window to keep data fresh
 * This replaces the old in-memory Map which was reset on every cold start.
 */
async function apiFetch<T>(path: string, revalidate: number, noCache = false): Promise<T[]> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "x-apisports-key": getApiKey(),
      "Content-Type": "application/json",
    },
    ...(noCache ? { cache: "no-store" } : { next: { revalidate } }),
  })

  // Capture rate limit from response headers (only on a live network request)
  const remaining = res.headers.get("x-ratelimit-requests-remaining")
  const total = res.headers.get("x-ratelimit-requests-limit")
  if (remaining !== null) _rateLimitRemaining = parseInt(remaining, 10)
  if (total !== null) _rateLimitTotal = parseInt(total, 10)

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status} ${res.statusText}`)
  }

  const json: ApiResponse<T> = await res.json()

  if (Array.isArray(json.errors) && json.errors.length > 0) {
    throw new Error(`API-Football errors: ${JSON.stringify(json.errors)}`)
  }
  if (typeof json.errors === "object" && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football errors: ${JSON.stringify(json.errors)}`)
  }

  // API can return null for response when there are no results — guard against it
  return json.response ?? []
}

/**
 * For endpoints that return a single object in `response` (not an array).
 * e.g. /teams/statistics
 */
async function apiFetchObject<T>(path: string, revalidate: number): Promise<T | null> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "x-apisports-key": getApiKey(),
      "Content-Type": "application/json",
    },
    next: { revalidate },
  })

  const remaining = res.headers.get("x-ratelimit-requests-remaining")
  const total = res.headers.get("x-ratelimit-requests-limit")
  if (remaining !== null) _rateLimitRemaining = parseInt(remaining, 10)
  if (total !== null) _rateLimitTotal = parseInt(total, 10)

  if (!res.ok) throw new Error(`API-Football error: ${res.status} ${res.statusText}`)

  const json = await res.json() as { response: T | null; errors?: unknown }
  return (json.response as T | null) ?? null
}

// European season: season=2025 means 2025/26. For April 2026, use currentYear - 1.
export function currentSeason(): number {
  return new Date().getFullYear() - 1
}

/**
 * Top 5 European league IDs — kept for standings/form enrichment only.
 * The fixture feed now uses global queries (all leagues).
 */
export const TOP_LEAGUES = [39, 140, 135, 78, 61] // PL, La Liga, Serie A, Bundesliga, Ligue 1

// ── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Fetch the global match feed — all leagues, all continents.
 * Cached for 60s at the edge so client-side 15s polling doesn't hammer the API.
 */
export async function fetchFixturesFeed(): Promise<ApiFixture[]> {
  const [nextResult, lastResult] = await Promise.allSettled([
    apiFetch<ApiFixture>("/fixtures?next=100", REVALIDATE_FEED),
    apiFetch<ApiFixture>("/fixtures?last=30", REVALIDATE_FEED),
  ])

  const seen = new Set<number>()
  const fixtures: ApiFixture[] = []

  for (const result of [nextResult, lastResult]) {
    if (result.status !== "fulfilled") continue
    for (const f of result.value) {
      if (!seen.has(f.fixture.id)) {
        seen.add(f.fixture.id)
        fixtures.push(f)
      }
    }
  }
  return fixtures
}

export async function fetchFixtureDetail(fixtureId: number): Promise<ApiFixture | null> {
  const results = await apiFetch<ApiFixture>(`/fixtures?id=${fixtureId}`, REVALIDATE_DETAIL)
  return results[0] ?? null
}

/** Live fixtures — short cache so scores stay current during play */
export async function fetchLiveFixtures(): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>("/fixtures?live=all", REVALIDATE_LIVE)
}

// ── Head-to-head ──────────────────────────────────────────────────────────────

export async function fetchHeadToHead(homeTeamId: number, awayTeamId: number): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>(
    `/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=5`,
    REVALIDATE_DETAIL,
  )
}

// ── Odds ─────────────────────────────────────────────────────────────────────

export async function fetchOdds(fixtureId: number): Promise<ApiOddsFixture | null> {
  const results = await apiFetch<ApiOddsFixture>(`/odds?fixture=${fixtureId}`, REVALIDATE_ODDS)
  return results[0] ?? null
}

/** In-play odds — shorter cache for live matches */
export async function fetchLiveOdds(fixtureId: number): Promise<ApiOddsFixture | null> {
  const results = await apiFetch<ApiOddsFixture>(
    `/odds/live?fixture=${fixtureId}`,
    REVALIDATE_ODDS_LIVE,
  )
  return results[0] ?? null
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function fetchPrediction(fixtureId: number): Promise<ApiPredictionFixture | null> {
  const results = await apiFetch<ApiPredictionFixture>(`/predictions?fixture=${fixtureId}`, REVALIDATE_PRED)
  return results[0] ?? null
}

// ── Standings ─────────────────────────────────────────────────────────────────

export async function fetchStandings(leagueId: number, season: number): Promise<ApiStandingResponse | null> {
  const results = await apiFetch<ApiStandingResponse>(
    `/standings?league=${leagueId}&season=${season}`,
    REVALIDATE_STANDINGS,
  )
  return results[0] ?? null
}

export async function fetchAllStandings(): Promise<ApiStandingResponse[]> {
  const season = currentSeason()
  const results = await Promise.allSettled(
    TOP_LEAGUES.map((id) => fetchStandings(id, season)),
  )
  return results
    .filter((r): r is PromiseFulfilledResult<ApiStandingResponse> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value)
}

// ── Injuries ──────────────────────────────────────────────────────────────────

export async function fetchInjuries(fixtureId: number): Promise<ApiInjury[]> {
  return apiFetch<ApiInjury>(`/injuries?fixture=${fixtureId}`, REVALIDATE_DETAIL)
}

// ── Top scorers ───────────────────────────────────────────────────────────────

export async function fetchTopScorers(leagueId: number, season: number): Promise<ApiPlayerStat[]> {
  return apiFetch<ApiPlayerStat>(
    `/players/topscorers?league=${leagueId}&season=${season}`,
    REVALIDATE_PLAYERS,
  )
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export async function fetchTransfers(teamId: number): Promise<ApiTransfer[]> {
  return apiFetch<ApiTransfer>(`/transfers?team=${teamId}`, REVALIDATE_PLAYERS)
}

// ── Sidelined ─────────────────────────────────────────────────────────────────

export async function fetchSidelined(playerId: number): Promise<ApiSidelined[]> {
  return apiFetch<ApiSidelined>(`/sidelined?player=${playerId}`, REVALIDATE_PLAYERS)
}

/** Fetch all sidelined players for a team */
export async function fetchSidelinedByTeam(teamId: number): Promise<ApiSidelined[]> {
  return apiFetch<ApiSidelined>(`/sidelined?team=${teamId}`, REVALIDATE_DETAIL)
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function fetchTeam(teamId: number): Promise<ApiTeam | null> {
  const results = await apiFetch<ApiTeam>(`/teams?id=${teamId}`, REVALIDATE_PLAYERS)
  return results[0] ?? null
}

export async function fetchTeamsByLeague(leagueId: number, season: number): Promise<ApiTeam[]> {
  return apiFetch<ApiTeam>(`/teams?league=${leagueId}&season=${season}`, REVALIDATE_PLAYERS)
}

// ── Coach ─────────────────────────────────────────────────────────────────────

export async function fetchCoach(teamId: number): Promise<ApiCoach | null> {
  const results = await apiFetch<ApiCoach>(`/coachs?team=${teamId}`, REVALIDATE_DETAIL)
  return results[0] ?? null
}

export async function fetchCoachById(coachId: number): Promise<ApiCoach | null> {
  const results = await apiFetch<ApiCoach>(`/coachs?id=${coachId}`, REVALIDATE_PLAYERS)
  return results[0] ?? null
}

// ── Trophies ──────────────────────────────────────────────────────────────────

export async function fetchTrophies(teamId: number): Promise<ApiTrophy[]> {
  return apiFetch<ApiTrophy>(`/trophies?team=${teamId}`, REVALIDATE_PLAYERS)
}

// ── Players ───────────────────────────────────────────────────────────────────

export async function fetchPlayerStatsByTeam(teamId: number, season: number): Promise<ApiPlayerStat[]> {
  return apiFetch<ApiPlayerStat>(`/players?team=${teamId}&season=${season}`, REVALIDATE_PLAYERS)
}

export async function fetchPlayerById(playerId: number, season: number): Promise<ApiPlayerStat | null> {
  const results = await apiFetch<ApiPlayerStat>(`/players?id=${playerId}&season=${season}`, REVALIDATE_PLAYERS)
  return results[0] ?? null
}

// ── Leagues ───────────────────────────────────────────────────────────────────

export async function fetchLeagues(country?: string): Promise<ApiLeague[]> {
  const path = country ? `/leagues?country=${encodeURIComponent(country)}&current=true` : `/leagues?current=true`
  return apiFetch<ApiLeague>(path, REVALIDATE_PLAYERS)
}

export async function fetchLeagueById(leagueId: number): Promise<ApiLeague | null> {
  const results = await apiFetch<ApiLeague>(`/leagues?id=${leagueId}`, REVALIDATE_PLAYERS)
  return results[0] ?? null
}

// ── Countries ─────────────────────────────────────────────────────────────────

export async function fetchCountries(): Promise<ApiCountry[]> {
  return apiFetch<ApiCountry>(`/countries`, REVALIDATE_PLAYERS)
}

// ── Global search ─────────────────────────────────────────────────────────────

/** Search teams by name — used for global fixture search */
export async function searchTeamsByName(query: string): Promise<ApiTeam[]> {
  return apiFetch<ApiTeam>(
    `/teams?search=${encodeURIComponent(query)}`,
    5 * 60,
    true, // no-cache for search
  )
}

/** Search leagues by name — uses API-Football's native search */
export async function searchLeaguesByName(query: string): Promise<ApiLeague[]> {
  return apiFetch<ApiLeague>(
    `/leagues?search=${encodeURIComponent(query)}`,
    5 * 60,
    true, // no-cache for search
  )
}

/**
 * Upcoming fixtures for a team.
 * NOTE: API-Football treats `next` and `last` as mutually exclusive —
 * never pass both in the same call.
 */
export async function fetchFixturesByTeam(
  teamId: number,
  next = 8,
): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>(`/fixtures?team=${teamId}&next=${next}`, 60)
}

/** Upcoming fixtures for a league+season */
export async function fetchFixturesByLeague(
  leagueId: number,
  season: number,
  next = 10,
): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>(
    `/fixtures?league=${leagueId}&season=${season}&next=${next}`,
    60,
  )
}

/** Recent fixtures for a team (for "last matches" on team pages) */
export async function fetchRecentFixturesByTeam(
  teamId: number,
  last = 5,
): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>(`/fixtures?team=${teamId}&last=${last}`, 60)
}

/** Upcoming fixtures at a venue */
export async function fetchFixturesByVenue(
  venueId: number,
  next = 8,
): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>(`/fixtures?venue=${venueId}&next=${next}`, 60)
}

// ── Player / Coach / Venue search ─────────────────────────────────────────────

/** Search players by name for a given season */
export async function searchPlayersByName(
  query: string,
  season: number,
): Promise<ApiPlayerStat[]> {
  return apiFetch<ApiPlayerStat>(
    `/players?search=${encodeURIComponent(query)}&season=${season}`,
    5 * 60,
    true, // no-cache — search must be fresh; stale empty results block new searches
  )
}

/** Search coaches by name */
export async function searchCoachesByName(query: string): Promise<ApiCoach[]> {
  return apiFetch<ApiCoach>(
    `/coachs?search=${encodeURIComponent(query)}`,
    5 * 60,
    true,
  )
}

/** Search venues by name */
export async function searchVenuesByName(query: string): Promise<ApiVenueResult[]> {
  return apiFetch<ApiVenueResult>(
    `/venues?search=${encodeURIComponent(query)}`,
    5 * 60,
    true,
  )
}

/** Venue by ID — capacity, surface, image */
export async function fetchVenueById(venueId: number): Promise<ApiVenueResult | null> {
  const results = await apiFetch<ApiVenueResult>(`/venues?id=${venueId}`, REVALIDATE_PLAYERS)
  return results[0] ?? null
}

// ── Team season statistics ─────────────────────────────────────────────────────

/**
 * Full season statistics for a team in a specific league.
 * Returns W/D/L breakdown (home/away/total), goals, form, streaks, clean sheets.
 * Uses /teams/statistics which returns a single object (not an array).
 */
export async function fetchTeamStatistics(
  teamId: number,
  leagueId: number,
  season: number,
): Promise<ApiTeamSeasonStats | null> {
  return apiFetchObject<ApiTeamSeasonStats>(
    `/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
    REVALIDATE_STANDINGS,
  )
}

// ── Seasons ───────────────────────────────────────────────────────────────────

/** Available seasons for a league (or all seasons if no leagueId given) */
export async function fetchSeasons(leagueId?: number): Promise<number[]> {
  const path = leagueId ? `/leagues/seasons` : `/leagues/seasons`
  const results = await apiFetch<number>(path, REVALIDATE_PLAYERS)
  return results
}
