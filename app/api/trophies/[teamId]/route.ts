import { NextRequest, NextResponse } from "next/server"
import { fetchTrophies } from "@/lib/api-football/client"
import { mapTrophies } from "@/lib/api-football/mapper"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const id = parseInt(teamId, 10)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 })

  try {
    const raw = await fetchTrophies(id)
    return NextResponse.json({ trophies: mapTrophies(raw) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
