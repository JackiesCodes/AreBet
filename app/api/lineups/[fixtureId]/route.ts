import { NextRequest, NextResponse } from "next/server"
import { fetchFixtureDetail } from "@/lib/api-football/client"
import { mapLineups } from "@/lib/api-football/mapper"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(_req: NextRequest, { params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params
  const id = parseInt(fixtureId, 10)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid fixture id" }, { status: 400 })

  try {
    const fixture = await fetchFixtureDetail(id)
    if (!fixture) return NextResponse.json({ lineup: null })
    const lineup = fixture.lineups?.length ? mapLineups(fixture.lineups) : null
    return NextResponse.json({ lineup })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
