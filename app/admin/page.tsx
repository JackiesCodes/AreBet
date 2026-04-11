"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { useMatchFeed } from "@/hooks/useMatchFeed"
import { Skeleton } from "@/components/primitives/Skeleton"
import type { SignalStatus } from "@/app/api/signals/status/route"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function pct(a: number, b: number) {
  if (b === 0) return "—"
  return `${Math.round((a / b) * 100)}%`
}

// ── Status indicator ──────────────────────────────────────────────────────────

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`admin-status-dot admin-status-dot--${ok ? "ok" : "warn"}`}>
      <span className="admin-status-pip" aria-hidden />
      {label}
    </span>
  )
}

// ── Env var check row ─────────────────────────────────────────────────────────

function EnvRow({
  name,
  configured,
  description,
  required,
}: {
  name: string
  configured: boolean
  description: string
  required?: boolean
}) {
  return (
    <div className="admin-env-row">
      <div className="admin-env-name">
        <code>{name}</code>
        {required && <span className="admin-env-required">required</span>}
      </div>
      <div className={`admin-env-value ${configured ? "admin-env-ok" : "admin-env-missing"}`}>
        {configured ? "✓ set" : "✗ not set"}
      </div>
      <div className="admin-env-desc">{description}</div>
    </div>
  )
}

// ── Backfill panel ────────────────────────────────────────────────────────────

interface BackfillState {
  status: "idle" | "running" | "done" | "error"
  result?: Record<string, unknown>
  error?: string
}

function BackfillPanel({
  backfillEnabled,
  unresolvedCount,
}: {
  backfillEnabled: boolean
  unresolvedCount: number
}) {
  const [secret, setSecret] = useState("")
  const [bfState, setBfState] = useState<BackfillState>({ status: "idle" })

  const runBackfill = useCallback(async () => {
    if (!secret.trim()) return
    setBfState({ status: "running" })
    try {
      const res = await fetch("/api/signals/backfill", {
        method: "POST",
        headers: { "x-admin-secret": secret.trim() },
      })
      const data = await res.json()
      if (!res.ok) {
        setBfState({ status: "error", error: data?.error ?? `HTTP ${res.status}` })
      } else {
        setBfState({ status: "done", result: data })
      }
    } catch (err) {
      setBfState({ status: "error", error: err instanceof Error ? err.message : String(err) })
    }
  }, [secret])

  if (!backfillEnabled) {
    return (
      <div className="admin-warn-box">
        <strong>Backfill disabled</strong> — Set <code>ADMIN_BACKFILL_SECRET</code> in your
        environment to enable signal backfill. Without this, unresolved signals can only be
        resolved via the live match-finished detection.
      </div>
    )
  }

  return (
    <div className="admin-backfill-panel">
      <p className="admin-backfill-desc">
        Backfill fetches results for the oldest {unresolvedCount > 0 ? `${Math.min(unresolvedCount, 15)} of ${unresolvedCount}` : "0"} unresolved
        signals from API-Football and resolves them. Each run processes up to 15
        fixtures (API rate-limit safe). Run again to process the next batch.
      </p>

      <div className="admin-backfill-form">
        <input
          type="password"
          className="admin-secret-input"
          placeholder="Admin secret (ADMIN_BACKFILL_SECRET)"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void runBackfill() }}
          autoComplete="off"
        />
        <button
          type="button"
          className="admin-backfill-btn"
          onClick={() => void runBackfill()}
          disabled={!secret.trim() || bfState.status === "running" || unresolvedCount === 0}
        >
          {bfState.status === "running" ? "Running…" : "Run backfill"}
        </button>
      </div>

      {unresolvedCount === 0 && (
        <div className="admin-backfill-note">No unresolved signals — nothing to backfill.</div>
      )}

      {bfState.status === "done" && bfState.result && (
        <div className="admin-backfill-result admin-backfill-result--ok">
          <strong>Backfill complete</strong>
          <div className="admin-backfill-summary">
            <span>Processed: {String(bfState.result.processed)}</span>
            <span>Resolved: {String(bfState.result.resolved)}</span>
            <span>Not finished: {String(bfState.result.notFinished)}</span>
            <span>Skipped: {String(bfState.result.skipped)}</span>
            <span>Errors: {String(bfState.result.errors)}</span>
          </div>
          {Array.isArray(bfState.result.messages) && bfState.result.messages.length > 0 && (
            <ul className="admin-backfill-messages">
              {(bfState.result.messages as string[]).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {bfState.status === "error" && (
        <div className="admin-backfill-result admin-backfill-result--error">
          <strong>Backfill failed</strong>: {bfState.error}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { matches, loading: feedLoading, error: feedError, fetchedAt } = useMatchFeed({
    pollIntervalMs: 30_000,
  })

  const [signalStatus, setSignalStatus] = useState<SignalStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/signals/status")
      if (res.ok) {
        const data = await res.json() as SignalStatus
        setSignalStatus(data)
      }
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    statusIntervalRef.current = setInterval(() => void loadStatus(), 15_000)
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
    }
  }, [loadStatus])

  const matchCounts = {
    live: matches.filter((m) => m.status === "LIVE").length,
    upcoming: matches.filter((m) => m.status === "UPCOMING").length,
    finished: matches.filter((m) => m.status === "FINISHED").length,
  }

  const resolveRate = signalStatus
    ? pct(signalStatus.totalResolved, signalStatus.totalRecorded)
    : "—"

  return (
    <div className="md-page">
      <PageHeader title="Admin" subtitle="System status, feed health, and signal operations" />

      {/* ── Feed health ────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Feed Health</CardTitle>
        <CardSubtitle>Match data source and polling status</CardSubtitle>

        <div className="admin-stat-row">
          <div className="admin-stat">
            <div className="admin-stat-label">Source</div>
            <div className="admin-stat-value">
              <StatusDot ok={!feedError} label={signalStatus?.demoMode ? "demo" : "live API"} />
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Last fetch</div>
            <div className="admin-stat-value md-mono" style={{ fontSize: 13 }}>
              {feedLoading ? "…" : (fetchedAt ? fmtTs(fetchedAt) : "—")}
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Total matches</div>
            <div className="admin-stat-value">{feedLoading ? <Skeleton /> : matches.length}</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Feed status</div>
            <div className="admin-stat-value">
              {feedLoading
                ? "loading"
                : feedError
                  ? <span className="md-text-negative">error</span>
                  : <span className="md-text-positive">healthy</span>
              }
            </div>
          </div>
        </div>

        {feedError && (
          <div className="admin-warn-box" style={{ marginTop: 12 }}>
            Feed error: {feedError}
          </div>
        )}

        <div className="admin-match-breakdown">
          {(["live", "upcoming", "finished"] as const).map((status) => (
            <div key={status} className="admin-match-bucket">
              <div className="admin-match-bucket-label">{status.toUpperCase()}</div>
              <div className="admin-match-bucket-count">{feedLoading ? "…" : matchCounts[status]}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Signal persistence ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Signal Persistence</CardTitle>
        <CardSubtitle>
          Track record data layer — signal recording, resolution, and Trust page state
        </CardSubtitle>

        {statusLoading ? (
          <Skeleton variant="list" count={4} />
        ) : signalStatus ? (
          <>
            <div className="admin-stat-row" style={{ marginTop: 16 }}>
              <div className="admin-stat">
                <div className="admin-stat-label">Recorded</div>
                <div className="admin-stat-value">{signalStatus.totalRecorded.toLocaleString()}</div>
                <div className="admin-stat-sub">total signals stored</div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat-label">Resolved</div>
                <div className="admin-stat-value admin-stat-value--positive">
                  {signalStatus.totalResolved.toLocaleString()}
                </div>
                <div className="admin-stat-sub">{resolveRate} resolve rate</div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat-label">Pending</div>
                <div className={`admin-stat-value ${signalStatus.totalUnresolved > 0 ? "admin-stat-value--warn" : ""}`}>
                  {signalStatus.totalUnresolved.toLocaleString()}
                </div>
                <div className="admin-stat-sub">awaiting outcome</div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat-label">Latest signal</div>
                <div className="admin-stat-value md-mono" style={{ fontSize: 12 }}>
                  {fmtTs(signalStatus.latestSignalAt)}
                </div>
              </div>
            </div>

            {/* Trust page data state */}
            <div className="admin-trust-state">
              <span className="admin-trust-state-label">Trust page showing:</span>
              {signalStatus.totalResolved > 0 ? (
                <span className="admin-trust-state-badge admin-trust-state-badge--live">
                  Live track record
                </span>
              ) : signalStatus.totalRecorded > 0 ? (
                <span className="admin-trust-state-badge admin-trust-state-badge--collecting">
                  Collecting signals
                </span>
              ) : (
                <span className="admin-trust-state-badge admin-trust-state-badge--demo">
                  Sample data
                </span>
              )}
              {!signalStatus.schemaReady && (
                <span className="admin-trust-state-badge admin-trust-state-badge--warn">
                  Schema not found
                </span>
              )}
            </div>

            {/* Schema warning */}
            {!signalStatus.schemaReady && (
              <div className="admin-warn-box">
                <strong>signal_snapshots table not found.</strong> Run the schema migration in
                Supabase Dashboard → SQL Editor. Find the SQL block in{" "}
                <code>supabase/schema.sql</code> (the section labelled "SIGNAL SNAPSHOTS").
              </div>
            )}
          </>
        ) : (
          <div className="admin-warn-box">Could not load signal status — check Supabase connectivity.</div>
        )}
      </Card>

      {/* ── Signal backfill ────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Signal Backfill</CardTitle>
        <CardSubtitle>
          Resolve unresolved signals by fetching match results from API-Football.
          Processes the oldest pending signals first, up to 15 per run.
        </CardSubtitle>

        <BackfillPanel
          backfillEnabled={signalStatus?.backfillEnabled ?? false}
          unresolvedCount={signalStatus?.totalUnresolved ?? 0}
        />
      </Card>

      {/* ── Environment checks ─────────────────────────────────────────── */}
      <Card>
        <CardTitle>Environment</CardTitle>
        <CardSubtitle>
          Required and optional environment variables for production operation
        </CardSubtitle>

        <div className="admin-env-table">
          <EnvRow
            name="NEXT_PUBLIC_SUPABASE_URL"
            configured={Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)}
            description="Supabase project URL — required for any DB operations"
            required
          />
          <EnvRow
            name="NEXT_PUBLIC_SUPABASE_ANON_KEY"
            configured={Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
            description="Supabase anon key — required for public reads (Trust page)"
            required
          />
          <EnvRow
            name="SUPABASE_SERVICE_ROLE_KEY"
            configured={signalStatus?.serviceKeyConfigured ?? false}
            description="Service-role key — required for signal writes and outcome resolution"
            required
          />
          <EnvRow
            name="API_FOOTBALL_KEY"
            configured={signalStatus?.apiFootballConfigured ?? false}
            description="API-Football v3 key — required for live feed and backfill"
          />
          <EnvRow
            name="ADMIN_BACKFILL_SECRET"
            configured={signalStatus?.backfillEnabled ?? false}
            description="Secret header value for the /api/signals/backfill route. Set to any strong random string."
          />
          <EnvRow
            name="NEXT_PUBLIC_USE_DEMO_DATA"
            configured={Boolean(process.env.NEXT_PUBLIC_USE_DEMO_DATA)}
            description="Set to 'true' to force demo/sample mode regardless of API key presence"
          />
        </div>

        {signalStatus && !signalStatus.serviceKeyConfigured && (
          <div className="admin-warn-box" style={{ marginTop: 12 }}>
            <strong>SUPABASE_SERVICE_ROLE_KEY is missing.</strong> Signal recording and outcome
            resolution will silently skip. Get the key from Supabase Dashboard → Project
            Settings → API → service_role. Add it to <code>.env.local</code> (never prefix
            with NEXT_PUBLIC_).
          </div>
        )}
      </Card>
    </div>
  )
}
