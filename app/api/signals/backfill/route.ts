/**
 * POST /api/signals/backfill
 *
 * Admin-only route that resolves unresolved signal snapshots by fetching
 * fixture results from API-Football.
 *
 * Protection: requires the `x-admin-secret` header to match the
 * `ADMIN_BACKFILL_SECRET` environment variable. Returns 401 if missing
 * or mismatched. If the env var is unset, the route is disabled entirely.
 *
 * Rate-limit awareness: processes at most 15 fixtures per call (configurable
 * via `?batch=N`) to stay within API-Football free-tier limits (100 req/day).
 *
 * Idempotent: already-resolved signals are skipped.
 *
 * Response: BackfillResult summary (see lib/utils/signal-backfill.ts)
 */

import { NextRequest, NextResponse } from "next/server"
import { backfillUnresolvedSignals } from "@/lib/utils/signal-backfill"

const MAX_BATCH = 15

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.ADMIN_BACKFILL_SECRET
  if (!secret) return false // Route disabled if env var unset
  return req.headers.get("x-admin-secret") === secret
}

export async function POST(req: NextRequest) {
  // Auth gate — must be checked first, before anything else
  if (!process.env.ADMIN_BACKFILL_SECRET) {
    return NextResponse.json(
      {
        error: "Backfill is disabled",
        detail: "Set ADMIN_BACKFILL_SECRET in your environment to enable this route.",
      },
      { status: 403 },
    )
  }

  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check dependencies before starting work
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 503 },
    )
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY is not configured — cannot fetch fixture results" },
      { status: 503 },
    )
  }

  // Optional batch override (capped at MAX_BATCH)
  const url = new URL(req.url)
  const batchParam = url.searchParams.get("batch")
  const batch = batchParam
    ? Math.min(Math.max(1, parseInt(batchParam, 10) || 1), MAX_BATCH)
    : MAX_BATCH

  const result = await backfillUnresolvedSignals(batch)

  return NextResponse.json({
    ok: true,
    batch,
    ...result,
  })
}
