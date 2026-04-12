/**
 * GET /api/players/topscorers?league=39&season=2025
 *
 * Returns top scorers for a given league + season.
 * Defaults to all TOP_LEAGUES for the current season.
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchTopScorers, currentSeason, TOP_LEAGUES } from "@/lib/api-football/client"
import { shouldUseDemoMode } from "@/lib/services/matches"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest) {
  if (shouldUseDemoMode()) {
    return NextResponse.json({ topScorers: [] })
  }

  const { searchParams } = req.nextUrl
  const leagueParam = searchParams.get("league")
  const seasonParam = searchParams.get("season")
  const season = seasonParam ? parseInt(seasonParam, 10) : currentSeason()

  try {
    if (leagueParam) {
      const leagueId = parseInt(leagueParam, 10)
      if (isNaN(leagueId)) {
        return NextResponse.json({ error: "Invalid league id" }, { status: 400 })
      }
      const players = await fetchTopScorers(leagueId, season)
      return NextResponse.json({ topScorers: players.slice(0, 10) })
    }

    // All top leagues — return top 5 per league
    const results = await Promise.allSettled(
      TOP_LEAGUES.map((id) => fetchTopScorers(id, season)),
    )

    const topScorers = TOP_LEAGUES.map((leagueId, i) => {
      const result = results[i]
      return {
        leagueId,
        players: result.status === "fulfilled" ? result.value.slice(0, 5) : [],
      }
    })

    return NextResponse.json({ topScorers })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
