/**
 * GET /api/standings?league=39&season=2025
 *
 * Proxies API-Football /standings. Accepts optional ?league= and ?season=
 * query params. Defaults to the top 5 European leagues for the current season
 * (fetching standings for every league globally is not feasible on any API tier).
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchAllStandings, fetchStandings, currentSeason } from "@/lib/api-football/client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const leagueParam = searchParams.get("league")
  const seasonParam = searchParams.get("season")
  const season = seasonParam ? parseInt(seasonParam, 10) : currentSeason()

  try {
    if (leagueParam) {
      const leagueId = parseInt(leagueParam, 10)
      if (isNaN(leagueId) || leagueId <= 0) {
        return NextResponse.json({ error: "Invalid league id" }, { status: 400 })
      }
      const data = await fetchStandings(leagueId, season)
      return NextResponse.json({ standings: data ? [data] : [] })
    }

    // Default: fetch top 5 European leagues (fetching all leagues is not feasible)
    const data = await fetchAllStandings()
    return NextResponse.json({ standings: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
