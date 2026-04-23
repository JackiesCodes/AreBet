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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ matches: [] })
  }

  try {
    // Search teams AND leagues by name in parallel (proper API search, not client-side filter)
    const [teams, leagues] = await Promise.all([
      searchTeamsByName(q).catch(() => []),
      searchLeaguesByName(q).catch(() => []),
    ])

    const topTeams = teams.slice(0, 3)
    const topLeagues = leagues.slice(0, 2)

    if (topTeams.length === 0 && topLeagues.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    const season = currentSeason()

    // Fetch upcoming fixtures for matched teams and leagues in parallel
    // Note: next and last are mutually exclusive on API-Football — use only next
    const fixtureResults = await Promise.allSettled([
      ...topTeams.map((t) => fetchFixturesByTeam(t.team.id, 8).catch(() => [])),
      ...topLeagues.map((l) => fetchFixturesByLeague(l.league.id, season, 10).catch(() => [])),
    ])

    // Flatten, deduplicate by fixture ID, map to Match
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

    // Sort: live first → upcoming by date → finished most recent first
    matches.sort((a, b) => {
      const order = { LIVE: 0, UPCOMING: 1, FINISHED: 2 }
      const oa = order[a.status] ?? 1
      const ob = order[b.status] ?? 1
      if (oa !== ob) return oa - ob
      const ta = new Date(a.kickoffISO).getTime()
      const tb = new Date(b.kickoffISO).getTime()
      return a.status === "FINISHED" ? tb - ta : ta - tb
    })

    return NextResponse.json({ matches: matches.slice(0, 20) })
  } catch (err) {
    // Surface error in dev, return empty in prod
    const message = err instanceof Error ? err.message : String(err)
    console.error("[/api/search] error:", message)
    return NextResponse.json({ matches: [], error: message }, { status: 200 })
  }
}
