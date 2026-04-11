/**
 * GET /api/signals/status
 *
 * Returns operational stats for the signal persistence layer.
 * Used by the Admin page — no auth required (counts only, no signal data).
 *
 * Response shape: SignalStatus
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

export interface SignalStatus {
  /** Total signal_snapshots rows (all, including unresolved) */
  totalRecorded: number
  /** Rows where is_correct IS NOT NULL */
  totalResolved: number
  /** Rows where is_correct IS NULL */
  totalUnresolved: number
  /** ISO timestamp of the most recently created signal, or null */
  latestSignalAt: string | null
  /** Whether SUPABASE_SERVICE_ROLE_KEY is set */
  serviceKeyConfigured: boolean
  /** Whether API_FOOTBALL_KEY is set */
  apiFootballConfigured: boolean
  /** Whether ADMIN_BACKFILL_SECRET is set */
  backfillEnabled: boolean
  /** Whether the app is in demo/sample data mode */
  demoMode: boolean
  /** Whether the schema table exists (inferred from query success) */
  schemaReady: boolean
}

export async function GET() {
  const serviceKeyConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const apiFootballConfigured = Boolean(process.env.API_FOOTBALL_KEY)
  const backfillEnabled = Boolean(process.env.ADMIN_BACKFILL_SECRET)
  const demoMode =
    process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true" || !process.env.API_FOOTBALL_KEY

  const base: Omit<SignalStatus, "totalRecorded" | "totalResolved" | "totalUnresolved" | "latestSignalAt" | "schemaReady"> = {
    serviceKeyConfigured,
    apiFootballConfigured,
    backfillEnabled,
    demoMode,
  }

  // Try to query the signal_snapshots table.
  // Use the browser/anon client — SELECT is public.
  // createClient() is imported from the browser client, but since this is a
  // route handler (Node.js environment), we instantiate it directly.
  try {
    // Can't use createClient() (browser-only) — build a minimal server fetch
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      return NextResponse.json<SignalStatus>({
        ...base,
        totalRecorded: 0,
        totalResolved: 0,
        totalUnresolved: 0,
        latestSignalAt: null,
        schemaReady: false,
      })
    }

    // Three parallel count queries via PostgREST
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "count=exact",
    }

    const [allRes, resolvedRes, latestRes] = await Promise.all([
      fetch(`${url}/rest/v1/signal_snapshots?select=signal_id`, { headers }),
      fetch(`${url}/rest/v1/signal_snapshots?is_correct=not.is.null&select=signal_id`, { headers }),
      fetch(
        `${url}/rest/v1/signal_snapshots?select=created_at&order=created_at.desc&limit=1`,
        { headers: { ...headers, Prefer: "" } },
      ),
    ])

    // schema not ready = table doesn't exist (404 or error response)
    if (!allRes.ok) {
      const errBody = await allRes.json().catch(() => ({}))
      const schemaReady = !(errBody?.code === "42P01" || allRes.status === 404)
      return NextResponse.json<SignalStatus>({
        ...base,
        totalRecorded: 0,
        totalResolved: 0,
        totalUnresolved: 0,
        latestSignalAt: null,
        schemaReady,
      })
    }

    // PostgREST returns total count in Content-Range: 0-0/N header
    const parseCount = (res: Response): number => {
      const cr = res.headers.get("content-range") ?? ""
      const match = cr.match(/\/(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    }

    const totalRecorded = parseCount(allRes)
    const totalResolved = resolvedRes.ok ? parseCount(resolvedRes) : 0
    const totalUnresolved = totalRecorded - totalResolved

    let latestSignalAt: string | null = null
    if (latestRes.ok) {
      const latestData = await latestRes.json().catch(() => [])
      latestSignalAt = latestData?.[0]?.created_at ?? null
    }

    return NextResponse.json<SignalStatus>({
      ...base,
      totalRecorded,
      totalResolved,
      totalUnresolved,
      latestSignalAt,
      schemaReady: true,
    })
  } catch {
    return NextResponse.json<SignalStatus>({
      ...base,
      totalRecorded: 0,
      totalResolved: 0,
      totalUnresolved: 0,
      latestSignalAt: null,
      schemaReady: false,
    })
  }
}
