import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  searchTeamsByName,
  fetchFixturesByTeam,
  fetchLeagues,
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
    // Search teams and leagues in parallel
    const [teams, leagues] = await Promise.all([
      searchTeamsByName(q).catch(() => []),
      fetchLeagues().catch(() => []),
    ])

    // Filter leagues by name match (API doesn't support text search on /leagues)
    const qLow = q.toLowerCase()
    const matchedLeagues = leagues
      .filter((l) => l.league.name.toLowerCase().includes(qLow))
      .slice(0, 2)

    const topTeams = teams.slice(0, 3)

    if (topTeams.length === 0 && matchedLeagues.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    const season = currentSeason()

    // Fetch fixtures for matched teams and leagues in parallel
    const fixtureResults = await Promise.allSettled([
      ...topTeams.map((t) =>
        fetchFixturesByTeam(t.team.id, { next: 5, last: 3 }).catch(() => []),
      ),
      ...matchedLeagues.map((l) =>
        fetchFixturesByLeague(l.league.id, season, 8).catch(() => []),
      ),
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

    // Sort: live first → upcoming by date → finished by date desc
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
  } catch {
    return NextResponse.json({ matches: [] })
  }
}
