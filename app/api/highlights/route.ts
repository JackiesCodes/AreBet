/**
 * GET /api/highlights?limit=5&status=all
 *
 * Returns the top N highlighted matches scored by the highlight engine.
 * Combines:
 *   - Current match feed (API-Football, cached at edge)
 *   - Editorial boosts (Supabase, public SELECT)
 *   - Popularity data (Supabase, service-role aggregate)
 *
 * Cache: 30s revalidation — fast enough for near-real-time, cheap on API quota.
 *
 * Query params:
 *   limit    — number of matches to return (default 5, max 20)
 *   status   — "all" | "live" | "upcoming" | "finished" (default "all")
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchMatchFeed } from "@/lib/services/matches"
import { fetchEditorialBoosts, fetchMatchPopularity } from "@/lib/services/highlights"
import { scoreAndRankMatches } from "@/lib/utils/highlight-engine"

export const dynamic    = "force-dynamic"
export const revalidate = 30

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit  = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "5", 10) || 5))
  const status = searchParams.get("status") ?? "all"

  try {
    // 1. Fetch all three data sources in parallel
    const [feed, boosts] = await Promise.all([
      fetchMatchFeed(),
      fetchEditorialBoosts(),
    ])

    // 2. Filter by status if requested
    let matches = feed.matches
    if (status === "live")     matches = matches.filter((m) => m.status === "LIVE")
    if (status === "upcoming") matches = matches.filter((m) => m.status === "UPCOMING")
    if (status === "finished") matches = matches.filter((m) => m.status === "FINISHED")

    // 3. Popularity: batch query using service-role client (bypasses RLS)
    const fixtureIds   = matches.map((m) => m.id)
    const popularityMap = await fetchMatchPopularity(fixtureIds)

    // 4. Score + sort
    const scored = scoreAndRankMatches(matches, boosts, popularityMap)

    // 5. Return top N — strip heavy detail-only fields to keep payload small
    const highlights = scored.slice(0, limit).map((m) => ({
      id:               m.id,
      leagueId:         m.leagueId,
      league:           m.league,
      country:          m.country,
      kickoffISO:       m.kickoffISO,
      status:           m.status,
      minute:           m.minute,
      home:             m.home,
      away:             m.away,
      score:            m.score,
      odds:             m.odds,
      prediction:       m.prediction,
      events:           m.events,
      highlightScore:   m.highlightScore,
      highlightBreakdown: m.highlightBreakdown,
      highlightLabel:   m.highlightLabel,
      // Popularity counts so the client can seed its local popularityMap
      popularity:       popularityMap.get(m.id) ?? { betCount: 0, favoriteCount: 0 },
    }))

    return NextResponse.json(
      { highlights, fetchedAt: feed.fetchedAt, total: scored.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10",
        },
      },
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
