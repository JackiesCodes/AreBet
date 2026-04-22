import { NextRequest, NextResponse } from "next/server"
import { fetchPlayerById, currentSeason } from "@/lib/api-football/client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const id = parseInt(playerId, 10)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid player id" }, { status: 400 })

  const { searchParams } = req.nextUrl
  const season = searchParams.get("season") ? parseInt(searchParams.get("season")!, 10) : currentSeason()

  try {
    const player = await fetchPlayerById(id, season)
    return NextResponse.json({ player })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
