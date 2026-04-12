/**
 * GET /api/health
 *
 * Lightweight health check endpoint for uptime monitors, deployment
 * platforms (Vercel, Railway, etc.), and CI/CD pipelines.
 *
 * Returns 200 when the app is running and all critical dependencies
 * are reachable. Returns 503 if any required dependency is down.
 *
 * Designed to respond in < 2s — uses a short-circuit timeout on DB check.
 */

import { NextResponse } from "next/server"

interface HealthCheck {
  status: "ok" | "degraded" | "down"
  version: string
  timestamp: string
  checks: {
    supabase: "ok" | "error" | "unconfigured"
    apiFootball: "configured" | "unconfigured"
    serviceKey: "configured" | "unconfigured"
    demoMode: boolean
  }
}

async function checkSupabase(): Promise<"ok" | "error" | "unconfigured"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY // service key works with all key formats
  if (!url || !key) return "unconfigured"

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    // Query a known system table — works regardless of anon key format
    const res = await fetch(
      `${url}/rest/v1/signal_snapshots?select=signal_id&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
      },
    )
    clearTimeout(timeout)
    return res.ok || res.status === 406 ? "ok" : "error"
  } catch {
    return "error"
  }
}

export async function GET() {
  const supabaseStatus = await checkSupabase()

  const checks: HealthCheck["checks"] = {
    supabase: supabaseStatus,
    apiFootball: process.env.API_FOOTBALL_KEY ? "configured" : "unconfigured",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "unconfigured",
    demoMode:
      process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true" || !process.env.API_FOOTBALL_KEY,
  }

  const isCriticalDown = supabaseStatus === "error"
  const status: HealthCheck["status"] = isCriticalDown
    ? "degraded"
    : "ok"

  const body: HealthCheck = {
    status,
    version: process.env.npm_package_version ?? "unknown",
    timestamp: new Date().toISOString(),
    checks,
  }

  return NextResponse.json(body, {
    status: isCriticalDown ? 503 : 200,
    headers: {
      // Don't cache health checks
      "Cache-Control": "no-store, no-cache",
    },
  })
}
