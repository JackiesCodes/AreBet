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
} from "./types"

const BASE_URL = "https://v3.football.api-sports.io"

// In-memory cache
const cache = new Map<string, { data: unknown; ts: number }>()
const FEED_TTL_MS = 30 * 60 * 1000       // 30 min — fixture feed
const DETAIL_TTL_MS = 2 * 60 * 60 * 1000 // 2 hr  — match detail / stats
const STANDINGS_TTL_MS = 6 * 60 * 60 * 1000 // 6 hr — standings
const PLAYERS_TTL_MS = 12 * 60 * 60 * 1000  // 12 hr — top scorers

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

async function apiFetch<T>(path: string, ttlMs: number): Promise<T[]> {
  const cached = cache.get(path)
  if (cached && Date.now() - cached.ts < ttlMs) {
    return cached.data as T[]
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "x-apisports-key": getApiKey(),
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  })

  // Capture rate limit from response headers
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

  cache.set(path, { data: json.response, ts: Date.now() })
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
 * Uses next=100 (upcoming) + last=30 (recently finished) in a single pair
 * of API calls. Deduplicates by fixture ID in case of overlap.
 * This is more efficient (2 calls vs 10) AND covers every league globally.
 */
export async function fetchFixturesFeed(): Promise<ApiFixture[]> {
  const [nextResult, lastResult] = await Promise.allSettled([
    apiFetch<ApiFixture>("/fixtures?next=100", FEED_TTL_MS),
    apiFetch<ApiFixture>("/fixtures?last=30", FEED_TTL_MS),
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
  const path = `/fixtures?id=${fixtureId}&statistics=true&events=true&lineups=true`
  const results = await apiFetch<ApiFixture>(path, DETAIL_TTL_MS)
  return results[0] ?? null
}

export async function fetchLiveFixtures(): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>("/fixtures?live=all", 60 * 1000) // 1 min TTL
}

// ── Head-to-head ──────────────────────────────────────────────────────────────

export async function fetchHeadToHead(homeTeamId: number, awayTeamId: number): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>(
    `/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=5`,
    DETAIL_TTL_MS,
  )
}

// ── Odds ─────────────────────────────────────────────────────────────────────

export async function fetchOdds(fixtureId: number): Promise<ApiOddsFixture | null> {
  const results = await apiFetch<ApiOddsFixture>(`/odds?fixture=${fixtureId}`, DETAIL_TTL_MS)
  return results[0] ?? null
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function fetchPrediction(fixtureId: number): Promise<ApiPredictionFixture | null> {
  const results = await apiFetch<ApiPredictionFixture>(`/predictions?fixture=${fixtureId}`, DETAIL_TTL_MS)
  return results[0] ?? null
}

// ── Standings ─────────────────────────────────────────────────────────────────

export async function fetchStandings(leagueId: number, season: number): Promise<ApiStandingResponse | null> {
  const results = await apiFetch<ApiStandingResponse>(
    `/standings?league=${leagueId}&season=${season}`,
    STANDINGS_TTL_MS,
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
  return apiFetch<ApiInjury>(`/injuries?fixture=${fixtureId}`, DETAIL_TTL_MS)
}

// ── Top scorers ───────────────────────────────────────────────────────────────

export async function fetchTopScorers(leagueId: number, season: number): Promise<ApiPlayerStat[]> {
  return apiFetch<ApiPlayerStat>(
    `/players/topscorers?league=${leagueId}&season=${season}`,
    PLAYERS_TTL_MS,
  )
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export async function fetchTransfers(teamId: number): Promise<ApiTransfer[]> {
  return apiFetch<ApiTransfer>(`/transfers?team=${teamId}`, PLAYERS_TTL_MS)
}

// ── Sidelined ─────────────────────────────────────────────────────────────────

export async function fetchSidelined(playerId: number): Promise<ApiSidelined[]> {
  return apiFetch<ApiSidelined>(`/sidelined?player=${playerId}`, PLAYERS_TTL_MS)
}
