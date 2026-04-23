import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  searchTeamsByName,
  searchLeaguesByName,
  fetchFixturesByTeam,
  fetchFixturesByLeague,
  currentSeason,
} from "@/lib/api-football/client"
import { mapFixtureToMatch } from "@/lib/api-football/mapper"
import type { Match } from "@/types/match"

export const dynamic = "force-dynamic"

// ── League popularity tiers ───────────────────────────────────────────────────
// Higher score = shown first when league popularity is the tiebreaker.
// Unknown leagues default to 5 (still included, just ranked lower).
const LEAGUE_POP: Record<number, number> = {
  // UEFA club competitions
  2: 100,   // UEFA Champions League
  3:  95,   // UEFA Europa League
  848: 88,  // UEFA Europa Conference League

  // Top 5 European leagues
  39:  90,  // Premier League (England)
  140: 90,  // La Liga (Spain)
  135: 90,  // Serie A (Italy)
  78:  90,  // Bundesliga (Germany)
  61:  90,  // Ligue 1 (France)

  // International tournaments
  1:   88,  // FIFA World Cup
  4:   86,  // UEFA Euro Championship
  5:   80,  // UEFA Nations League
  6:   78,  // FIFA Friendlies (Nations)
  10:  75,  // FIFA World Cup Qualification

  // Second-tier European
  45:  78,  // FA Cup (England)
  48:  76,  // League Cup (England)
  143: 74,  // Copa del Rey (Spain)
  137: 74,  // Coppa Italia
  81:  74,  // DFB Pokal (Germany)
  66:  74,  // Coupe de France
  94:  72,  // Primeira Liga (Portugal)
  88:  72,  // Eredivisie (Netherlands)
  144: 70,  // Pro League (Belgium)
  207: 68,  // Süper Lig (Turkey)
  119: 65,  // Superliga (Denmark)
  113: 65,  // Allsvenskan (Sweden)
  103: 65,  // Eliteserien (Norway)
  106: 65,  // Ekstraklasa (Poland)
  218: 64,  // Scottish Premiership

  // South American
  13:  82,  // Copa Libertadores
  11:  78,  // Copa Sudamericana
  71:  72,  // Brasileirão Série A
  73:  65,  // Brasileirão Série B
  128: 70,  // Argentine Primera División
  239: 65,  // Chilean Primera División

  // North American
  253: 68,  // MLS (USA)
  262: 64,  // Liga MX (Mexico)

  // Asian / African
  169: 60,  // Saudi Pro League
  188: 58,  // Egyptian Premier League
  17:  56,  // AFC Champions League
}

function leaguePop(leagueId: number | null | undefined): number {
  if (!leagueId) return 5
  return LEAGUE_POP[leagueId] ?? 5
}

// ── Name match quality ────────────────────────────────────────────────────────
// Returns 0–3; used to ensure "Arsenal" returns Arsenal FC before Arsenal Tula
function nameMatchScore(name: string, q: string): number {
  const n = name.toLowerCase()
  if (n === q) return 3                                      // exact
  if (n.startsWith(q + " ") || n.startsWith(q)) return 2    // starts with
  if (n.includes(q)) return 1                                // contains
  return 0
}

function relevanceScore(match: Match, q: string): number {
  const ql = q.toLowerCase()
  const nameScore = Math.max(
    nameMatchScore(match.home.name, ql),
    nameMatchScore(match.away.name, ql),
    nameMatchScore(match.league, ql),
  )
  // name quality is 10× more important than league tier
  return nameScore * 1000 + leaguePop(match.leagueId)
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ matches: [] })
  }

  try {
    const [teams, leagues] = await Promise.all([
      searchTeamsByName(q).catch(() => []),
      searchLeaguesByName(q).catch(() => []),
    ])

    const topTeams = teams.slice(0, 4)
    const topLeagues = leagues.slice(0, 2)

    if (topTeams.length === 0 && topLeagues.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    const season = currentSeason()

    const fixtureResults = await Promise.allSettled([
      ...topTeams.map((t) => fetchFixturesByTeam(t.team.id, 8).catch(() => [])),
      ...topLeagues.map((l) => fetchFixturesByLeague(l.league.id, season, 10).catch(() => [])),
    ])

    const seen = new Set<number>()
    const matches: Match[] = []

    for (const result of fixtureResults) {
      if (result.status !== "fulfilled") continue
      for (const f of result.value) {
        if (seen.has(f.fixture.id)) continue
        seen.add(f.fixture.id)
        matches.push(mapFixtureToMatch(f))
      }
    }

    // Rank: live first, then by relevance score (name quality × league popularity),
    // ties broken by soonest date first (most recent first for finished)
    matches.sort((a, b) => {
      const aLive = a.status === "LIVE" ? 1 : 0
      const bLive = b.status === "LIVE" ? 1 : 0
      if (aLive !== bLive) return bLive - aLive

      const scoreDiff = relevanceScore(b, q) - relevanceScore(a, q)
      if (scoreDiff !== 0) return scoreDiff

      const ta = new Date(a.kickoffISO).getTime()
      const tb = new Date(b.kickoffISO).getTime()
      return a.status === "FINISHED" ? tb - ta : ta - tb
    })

    return NextResponse.json({ matches: matches.slice(0, 20) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[/api/search] error:", message)
    return NextResponse.json({ matches: [], error: message }, { status: 200 })
  }
}
