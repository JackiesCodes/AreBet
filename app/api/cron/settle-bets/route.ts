import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { settleFixture } from "@/lib/services/settlement"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// How long after kickoff a fixture is even worth checking. Regular time +
// stoppage/extra time/penalties comfortably fits inside this window;
// settleFixture() is a no-op anyway if the fixture isn't FINISHED, so this
// only exists to avoid burning API-Football quota on fixtures that can't
// possibly be over yet.
const SETTLEMENT_ELIGIBLE_AFTER_MS = 90 * 60 * 1000

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // must be configured — fail closed
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const service = createServiceClient()
  const cutoffIso = new Date(Date.now() - SETTLEMENT_ELIGIBLE_AFTER_MS).toISOString()

  const { data: pending, error } = await service
    .from("user_bets")
    .select("fixture_id")
    .eq("result", "PENDING")
    .lt("kickoff_iso", cutoffIso)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const fixtureIds = Array.from(new Set((pending ?? []).map((b: { fixture_id: number }) => b.fixture_id)))

  const results = []
  for (const fixtureId of fixtureIds) {
    results.push({ fixtureId, ...(await settleFixture(fixtureId)) })
  }

  return NextResponse.json({ processed: fixtureIds.length, results })
}
