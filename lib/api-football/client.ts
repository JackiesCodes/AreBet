import type { ApiResponse, ApiFixture, ApiOddsFixture, ApiPredictionFixture } from "./types"

const BASE_URL = "https://v3.football.api-sports.io"

// In-memory cache to reduce API calls (100/day on free tier)
const cache = new Map<string, { data: unknown; ts: number }>()
const FEED_TTL_MS = 30 * 60 * 1000      // 30 min for fixture feed
const DETAIL_TTL_MS = 2 * 60 * 60 * 1000 // 2 hr for odds/predictions/stats

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

function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

function tomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

// Top 5 European league IDs
const TOP_LEAGUES = [39, 140, 135, 78, 61] // PL, La Liga, Serie A, Bundesliga, Ligue 1

export async function fetchFixturesFeed(): Promise<ApiFixture[]> {
  const today = todayStr()
  const tomorrow = tomorrowStr()
  const season = new Date().getFullYear()

  // Fetch today + tomorrow fixtures for top leagues
  const requests = TOP_LEAGUES.flatMap((leagueId) => [
    apiFetch<ApiFixture>(`/fixtures?league=${leagueId}&season=${season}&date=${today}`, FEED_TTL_MS),
    apiFetch<ApiFixture>(`/fixtures?league=${leagueId}&season=${season}&date=${tomorrow}`, FEED_TTL_MS),
  ])

  const results = await Promise.allSettled(requests)
  const fixtures: ApiFixture[] = []

  for (const result of results) {
    if (result.status === "fulfilled") {
      fixtures.push(...result.value)
    }
  }

  return fixtures
}

export async function fetchFixtureDetail(fixtureId: number): Promise<ApiFixture | null> {
  const path = `/fixtures?id=${fixtureId}&statistics=true&events=true&lineups=true`
  const results = await apiFetch<ApiFixture>(path, DETAIL_TTL_MS)
  return results[0] ?? null
}

export async function fetchOdds(fixtureId: number): Promise<ApiOddsFixture | null> {
  const results = await apiFetch<ApiOddsFixture>(`/odds?fixture=${fixtureId}`, DETAIL_TTL_MS)
  return results[0] ?? null
}

export async function fetchPrediction(fixtureId: number): Promise<ApiPredictionFixture | null> {
  const results = await apiFetch<ApiPredictionFixture>(`/predictions?fixture=${fixtureId}`, DETAIL_TTL_MS)
  return results[0] ?? null
}

export async function fetchLiveFixtures(): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture>("/fixtures?live=all", 60 * 1000) // 1 min TTL for live
}
