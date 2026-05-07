/**
 * Admin-only API for editorial boost management.
 *
 * Protected by ADMIN_SECRET header — all requests must include:
 *   x-admin-secret: <value of ADMIN_SECRET env var>
 *
 * Routes:
 *   GET    /api/admin/boost           — list all boosts
 *   POST   /api/admin/boost           — upsert a boost
 *   DELETE /api/admin/boost?fixture_id=N — remove a boost
 *
 * POST body:
 *   {
 *     fixture_id: number,      // required
 *     score:      number,      // 0-1, required
 *     label:      string|null, // optional display label
 *     expires_at: string|null, // ISO timestamp or null
 *     home_team:  string,      // optional, for admin display
 *     away_team:  string,      // optional, for admin display
 *     kickoff_at: string,      // optional, for admin display
 *   }
 */

import { NextRequest, NextResponse } from "next/server"
import {
  listEditorialBoosts,
  upsertEditorialBoost,
  deleteEditorialBoost,
} from "@/lib/services/highlights"

// ── Auth guard ────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false  // Must be configured — fail closed
  return req.headers.get("x-admin-secret") === secret
}

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 })

// ── GET — list all boosts ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return UNAUTHORIZED

  const boosts = await listEditorialBoosts()
  return NextResponse.json({ boosts })
}

// ── POST — upsert a boost ─────────────────────────────────────────────────────

interface BoostBody {
  fixture_id: number
  score:      number
  label?:     string | null
  expires_at?: string | null
  home_team?:  string
  away_team?:  string
  kickoff_at?: string
}

function validateBoostBody(body: unknown): body is BoostBody {
  if (!body || typeof body !== "object") return false
  const b = body as Record<string, unknown>
  return (
    typeof b.fixture_id === "number" &&
    Number.isInteger(b.fixture_id) &&
    b.fixture_id > 0 &&
    typeof b.score === "number" &&
    b.score >= 0 &&
    b.score <= 1
  )
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return UNAUTHORIZED

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!validateBoostBody(body)) {
    return NextResponse.json(
      { error: "fixture_id (integer > 0) and score (0-1) are required" },
      { status: 422 },
    )
  }

  const result = await upsertEditorialBoost({
    fixture_id: body.fixture_id,
    score:      body.score,
    label:      body.label ?? null,
    expires_at: body.expires_at ?? null,
    home_team:  body.home_team,
    away_team:  body.away_team,
    kickoff_at: body.kickoff_at ? new Date(body.kickoff_at).toISOString() : undefined,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE — remove a boost ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return UNAUTHORIZED

  const fixtureId = parseInt(new URL(req.url).searchParams.get("fixture_id") ?? "", 10)
  if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
    return NextResponse.json({ error: "fixture_id query param required" }, { status: 422 })
  }

  const result = await deleteEditorialBoost(fixtureId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
