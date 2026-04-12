/**
 * GET /api/standings?league=39&season=2025
 *
 * Proxies API-Football /standings. Accepts optional ?league= and ?season=
 * query params. Defaults to all TOP_LEAGUES for the current season.
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchAllStandings, fetchStandings, currentSeason, TOP_LEAGUES } from "@/lib/api-football/client"
import { shouldUseDemoMode } from "@/lib/services/matches"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest) {
  if (shouldUseDemoMode()) {
    return NextResponse.json({ standings: [], demo: true })
  }

  const { searchParams } = req.nextUrl
  const leagueParam = searchParams.get("league")
  const seasonParam = searchParams.get("season")
  const season = seasonParam ? parseInt(seasonParam, 10) : currentSeason()

  try {
    if (leagueParam) {
      const leagueId = parseInt(leagueParam, 10)
      if (isNaN(leagueId) || !TOP_LEAGUES.includes(leagueId)) {
        return NextResponse.json({ error: "Invalid league id" }, { status: 400 })
      }
      const data = await fetchStandings(leagueId, season)
      return NextResponse.json({ standings: data ? [data] : [] })
    }

    const data = await fetchAllStandings()
    return NextResponse.json({ standings: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
