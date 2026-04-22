import { NextRequest, NextResponse } from "next/server"
import { fetchLeagues, fetchLeagueById } from "@/lib/api-football/client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const id = searchParams.get("id")
  const country = searchParams.get("country") ?? undefined

  try {
    if (id) {
      const league = await fetchLeagueById(parseInt(id, 10))
      return NextResponse.json({ league })
    }
    const leagues = await fetchLeagues(country)
    return NextResponse.json({ leagues })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
