import { NextResponse } from "next/server"
import { getAndSnapshotOdds } from "@/lib/services/odds-snapshot"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId: fixtureIdParam } = await params
  const fixtureId = Number.parseInt(fixtureIdParam, 10)
  if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
    return NextResponse.json({ error: "Invalid fixture id" }, { status: 400 })
  }

  try {
    const quotes = await getAndSnapshotOdds(fixtureId)
    return NextResponse.json({ quotes })
  } catch (err) {
    console.error("[odds] error:", err)
    return NextResponse.json({ error: "Failed to load odds" }, { status: 500 })
  }
}
