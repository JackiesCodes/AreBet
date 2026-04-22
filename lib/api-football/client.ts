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
  ApiCoach,
  ApiTrophy,
  ApiLeague,
  ApiCountry,
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
async function apiFetch<T>(path: string, revalidate: number): Promise<T[]> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "x-apisports-key": getApiKey(),
      "Content-Type": "application/json",
    },
    next: { revalidate },
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

  return json.response
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
