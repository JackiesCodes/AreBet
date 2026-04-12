/**
 * GET /api/rate-limit
 *
 * Returns the current API-Football rate limit status captured from the
 * most recent API response headers. Values are null until the first
 * real API call is made (e.g., after the feed first loads).
 */

import { NextResponse } from "next/server"
import { getRateLimitStatus } from "@/lib/api-football/client"

export interface RateLimitStatus {
  remaining: number | null
  total: number | null
  used: number | null
  pctUsed: number | null
}

export async function GET() {
  const { remaining, total } = getRateLimitStatus()

  const used = remaining !== null && total !== null ? total - remaining : null
  const pctUsed = used !== null && total !== null && total > 0
    ? Math.round((used / total) * 100)
    : null

  const body: RateLimitStatus = { remaining, total, used, pctUsed }

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store, no-cache" },
  })
}
