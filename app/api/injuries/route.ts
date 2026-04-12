/**
 * GET /api/injuries?fixture=12345
 *
 * Returns injury report for a specific fixture.
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchInjuries } from "@/lib/api-football/client"
import { shouldUseDemoMode } from "@/lib/services/matches"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest) {
  if (shouldUseDemoMode()) {
    return NextResponse.json({ injuries: [] })
  }

  const fixtureParam = req.nextUrl.searchParams.get("fixture")
  const fixtureId = fixtureParam ? parseInt(fixtureParam, 10) : NaN

  if (isNaN(fixtureId)) {
    return NextResponse.json({ error: "Missing or invalid ?fixture= param" }, { status: 400 })
  }

  try {
    const injuries = await fetchInjuries(fixtureId)
    return NextResponse.json({ injuries })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
