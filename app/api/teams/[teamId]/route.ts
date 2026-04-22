import { NextRequest, NextResponse } from "next/server"
import { fetchTeam, fetchTransfers, fetchSidelinedByTeam, fetchCoach, fetchTrophies, currentSeason, fetchTopScorers } from "@/lib/api-football/client"
import { mapCoach, mapTrophies, mapTransfers, mapSidelined } from "@/lib/api-football/mapper"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const id = parseInt(teamId, 10)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 })

  try {
    const season = currentSeason()
    const [teamResult, coachResult, trophiesResult, transfersResult, sidelinedResult, topScorersResult] =
      await Promise.allSettled([
        fetchTeam(id),
        fetchCoach(id),
        fetchTrophies(id),
        fetchTransfers(id),
        fetchSidelinedByTeam(id),
        fetchTopScorers(id, season),
      ])

    return NextResponse.json({
      team: teamResult.status === "fulfilled" ? teamResult.value : null,
      coach: coachResult.status === "fulfilled" && coachResult.value ? mapCoach(coachResult.value) : null,
      trophies: trophiesResult.status === "fulfilled" ? mapTrophies(trophiesResult.value) : [],
      transfers: transfersResult.status === "fulfilled" ? mapTransfers(transfersResult.value) : [],
      sidelined: sidelinedResult.status === "fulfilled" ? mapSidelined(sidelinedResult.value) : [],
      topScorers: topScorersResult.status === "fulfilled" ? topScorersResult.value.slice(0, 10) : [],
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
