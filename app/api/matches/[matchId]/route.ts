import { NextResponse } from "next/server"
import { fetchMatchById } from "@/lib/services/matches"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const id = Number.parseInt(matchId, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 })
  }
  const match = await fetchMatchById(id)
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(match)
}
