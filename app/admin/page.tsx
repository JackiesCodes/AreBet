"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { useMatchFeedCtx } from "@/contexts/MatchFeedContext"
import { useAuth } from "@/lib/auth/context"
import { Skeleton } from "@/components/primitives/Skeleton"
import type { RateLimitStatus } from "@/app/api/rate-limit/route"
import type { EditorialBoostRow } from "@/lib/services/highlights"

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

// ── Editorial Boost Panel ─────────────────────────────────────────────────────

const BOOST_LABELS = ["Top Pick", "Derby", "Final", "Editor's Choice", "Promoted", "Big Match"]

function BoostPanel() {
  const [boosts, setBoosts] = useState<EditorialBoostRow[]>([])
  const [loading, setLoading] = useState(false)
  const [secret, setSecret] = useState("")
  const [fixtureId, setFixtureId] = useState("")
  const [homeTeam, setHomeTeam] = useState("")
  const [awayTeam, setAwayTeam] = useState("")
  const [score, setScore] = useState("1.0")
  const [label, setLabel] = useState(BOOST_LABELS[0])
  const [expiresAt, setExpiresAt] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3000)
  }

  async function loadBoosts() {
    if (!secret) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/boost", {
        headers: { "x-admin-secret": secret },
      })
      if (res.ok) {
        const data: { boosts: EditorialBoostRow[] } = await res.json()
        setBoosts(data.boosts)
      } else {
        flash(false, "Failed to load boosts — check ADMIN_SECRET")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const fid = parseInt(fixtureId, 10)
    const sc  = parseFloat(score)
    if (!Number.isFinite(fid) || fid <= 0) { flash(false, "Invalid fixture ID"); return }
    if (!Number.isFinite(sc) || sc < 0 || sc > 1) { flash(false, "Score must be 0–1"); return }

    const res = await fetch("/api/admin/boost", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body:    JSON.stringify({
        fixture_id: fid,
        score:      sc,
        label:      label || null,
        expires_at: expiresAt || null,
        home_team:  homeTeam || null,
        away_team:  awayTeam || null,
      }),
    })
    if (res.ok) {
      flash(true, "Boost saved")
      setFixtureId(""); setHomeTeam(""); setAwayTeam(""); setExpiresAt("")
      loadBoosts()
    } else {
      flash(false, "Failed to save boost")
    }
  }

  async function handleRemove(fixture_id: number) {
    const res = await fetch(`/api/admin/boost?fixture_id=${fixture_id}`, {
      method:  "DELETE",
      headers: { "x-admin-secret": secret },
    })
    if (res.ok) {
      flash(true, "Boost removed")
      setBoosts((prev) => prev.filter((b) => b.fixture_id !== fixture_id))
    } else {
      flash(false, "Failed to remove boost")
    }
  }

  return (
    <div className="admin-boost-form">
      {/* Secret input */}
      <div className="admin-boost-row">
        <div className="admin-boost-field" style={{ maxWidth: 280 }}>
          <label htmlFor="admin-secret">Admin Secret</label>
          <input
            id="admin-secret"
            type="password"
            className="admin-boost-input"
            placeholder="Value of ADMIN_SECRET env var"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onBlur={loadBoosts}
          />
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd}>
        <div className="admin-boost-row">
          <div className="admin-boost-field" style={{ maxWidth: 120 }}>
            <label htmlFor="boost-fixture">Fixture ID</label>
            <input id="boost-fixture" type="number" className="admin-boost-input" placeholder="123456"
              value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} />
          </div>
          <div className="admin-boost-field">
            <label htmlFor="boost-home">Home team</label>
            <input id="boost-home" type="text" className="admin-boost-input" placeholder="Arsenal"
              value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} />
          </div>
          <div className="admin-boost-field">
            <label htmlFor="boost-away">Away team</label>
            <input id="boost-away" type="text" className="admin-boost-input" placeholder="Chelsea"
              value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} />
          </div>
        </div>
        <div className="admin-boost-row" style={{ marginTop: 8 }}>
          <div className="admin-boost-field" style={{ maxWidth: 100 }}>
            <label htmlFor="boost-score">Score (0–1)</label>
            <input id="boost-score" type="number" step="0.1" min="0" max="1" className="admin-boost-input"
              value={score} onChange={(e) => setScore(e.target.value)} />
          </div>
          <div className="admin-boost-field">
            <label htmlFor="boost-label">Label</label>
            <select id="boost-label" className="admin-boost-input"
              value={label} onChange={(e) => setLabel(e.target.value)}>
              {BOOST_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="">No label</option>
            </select>
          </div>
          <div className="admin-boost-field">
            <label htmlFor="boost-expires">Expires at (optional)</label>
            <input id="boost-expires" type="datetime-local" className="admin-boost-input"
              value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="admin-boost-field" style={{ maxWidth: 100, justifyContent: "flex-end" }}>
            <label>&nbsp;</label>
            <button type="submit" className="admin-btn">Add Boost</button>
          </div>
        </div>
      </form>

      {msg && (
        <div style={{ fontSize: 13, color: msg.ok ? "var(--positive)" : "var(--negative)" }}>
          {msg.text}
        </div>
      )}

      {/* Active boosts list */}
      {loading && <div className="md-text-muted" style={{ fontSize: 13 }}>Loading…</div>}
      {!loading && boosts.length > 0 && (
        <div className="admin-boost-list">
          {boosts.map((b) => (
            <div key={b.fixture_id} className="admin-boost-item">
              <span className="admin-boost-teams">
                {b.home_team && b.away_team ? `${b.home_team} vs ${b.away_team}` : `Fixture #${b.fixture_id}`}
              </span>
              {b.label && <span className="admin-boost-meta">{b.label}</span>}
              <span className="admin-boost-score">{b.score.toFixed(2)}</span>
              {b.expires_at && (
                <span className="admin-boost-meta">
                  expires {new Date(b.expires_at).toLocaleDateString()}
                </span>
              )}
              <button type="button" className="admin-boost-remove" onClick={() => handleRemove(b.fixture_id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      {!loading && boosts.length === 0 && secret && (
        <div className="md-text-muted" style={{ fontSize: 13 }}>No active boosts.</div>
      )}
    </div>
  )
}

// ── Auth guard wrapper ────────────────────────────────────────────────────────
// Separating auth check from AdminContent avoids conditional hook calls.

export default function AdminPage() {
  const { user, loading: authLoading, role } = useAuth()

  if (authLoading) {
    return (
      <div className="md-page">
        <PageHeader title="Admin" subtitle="Loading…" />
        <Skeleton variant="list" count={4} />
      </div>
    )
  }

  if (!user || role !== "admin") {
    return (
      <div className="md-page">
        <PageHeader title="Admin" subtitle="Restricted area" />
        <div className="admin-warn-box" style={{ marginTop: 24 }}>
          <strong>Access denied.</strong>{" "}
          {!user
            ? "You must be signed in to view this page."
            : "Your account does not have admin privileges. Contact the site owner to request access."}
        </div>
      </div>
    )
  }

  return <AdminContent />
}

// ── Admin content (only rendered for role=admin) ───────────────────────────

function AdminContent() {
  const { matches, loading: feedLoading, error: feedError, fetchedAt } = useMatchFeedCtx()

  const [statusLoading, setStatusLoading] = useState(true)
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null)
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const [rlRes] = await Promise.allSettled([
        fetch("/api/rate-limit"),
      ])
      if (rlRes.status === "fulfilled" && rlRes.value.ok) {
        setRateLimit(await rlRes.value.json() as RateLimitStatus)
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
              <StatusDot ok={!feedError} label={feedError ? "error" : "live API"} />
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

      {/* ── API rate budget ───────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>API Rate Budget</CardTitle>
        <CardSubtitle>API-Football requests remaining for today (resets at midnight UTC)</CardSubtitle>

        {statusLoading ? (
          <Skeleton variant="list" count={2} />
        ) : rateLimit ? (
          <>
            {rateLimit.remaining === null ? (
              <div className="admin-warn-box" style={{ marginTop: 8 }}>
                Rate limit data not yet available — it appears after the first API call (e.g., after the feed loads).
              </div>
            ) : (
              <div className="admin-stat-row" style={{ marginTop: 16 }}>
                <div className="admin-stat">
                  <div className="admin-stat-label">Remaining</div>
                  <div className={`admin-stat-value ${(rateLimit.remaining ?? 0) < 20 ? "admin-stat-value--warn" : "admin-stat-value--positive"}`}>
                    {rateLimit.remaining?.toLocaleString() ?? "—"}
                  </div>
                  <div className="admin-stat-sub">requests left today</div>
                </div>
                <div className="admin-stat">
                  <div className="admin-stat-label">Used</div>
                  <div className="admin-stat-value">{rateLimit.used?.toLocaleString() ?? "—"}</div>
                  <div className="admin-stat-sub">of {rateLimit.total?.toLocaleString() ?? "—"} daily limit</div>
                </div>
                <div className="admin-stat">
                  <div className="admin-stat-label">Usage</div>
                  <div className="admin-stat-value">{rateLimit.pctUsed !== null ? `${rateLimit.pctUsed}%` : "—"}</div>
                  <div className="admin-stat-sub">of daily quota</div>
                </div>
                {rateLimit.total !== null && rateLimit.remaining !== null && (
                  <div className="admin-stat" style={{ flex: 2 }}>
                    <div className="admin-stat-label">Budget bar</div>
                    <div style={{ marginTop: 6, height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(0, 100 - (rateLimit.pctUsed ?? 0))}%`,
                          background: (rateLimit.pctUsed ?? 0) > 80
                            ? "var(--negative)"
                            : (rateLimit.pctUsed ?? 0) > 50
                              ? "var(--warning)"
                              : "var(--positive)",
                          borderRadius: 4,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <div className="admin-stat-sub" style={{ marginTop: 4 }}>
                      {rateLimit.remaining} req remaining
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="admin-warn-box">Could not load rate limit status.</div>
        )}
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
            description="Supabase anon key — required for public reads"
            required
          />
          <EnvRow
            name="API_FOOTBALL_KEY"
            configured={Boolean(process.env.API_FOOTBALL_KEY)}
            description="API-Football v3 key — required for live feed"
          />
          <EnvRow
            name="NEXT_PUBLIC_USE_DEMO_DATA"
            configured={Boolean(process.env.NEXT_PUBLIC_USE_DEMO_DATA)}
            description="Set to 'true' to force demo/sample mode regardless of API key presence"
          />
          <EnvRow
            name="STRIPE_SECRET_KEY"
            configured={Boolean(process.env.STRIPE_SECRET_KEY)}
            description="Stripe secret key — required for subscription checkout and webhooks"
          />
          <EnvRow
            name="STRIPE_WEBHOOK_SECRET"
            configured={Boolean(process.env.STRIPE_WEBHOOK_SECRET)}
            description="Stripe webhook signing secret — required to verify payment events"
          />
          <EnvRow
            name="STRIPE_PRO_PRICE_ID"
            configured={Boolean(process.env.STRIPE_PRO_PRICE_ID)}
            description="Stripe Price ID for Pro plan (e.g. price_xxx)"
          />
          <EnvRow
            name="STRIPE_ELITE_PRICE_ID"
            configured={Boolean(process.env.STRIPE_ELITE_PRICE_ID)}
            description="Stripe Price ID for Elite plan"
          />
          <EnvRow
            name="VAPID_PUBLIC_KEY"
            configured={Boolean(process.env.VAPID_PUBLIC_KEY)}
            description="VAPID public key for Web Push — generate with: npx web-push generate-vapid-keys"
          />
          <EnvRow
            name="VAPID_PRIVATE_KEY"
            configured={Boolean(process.env.VAPID_PRIVATE_KEY)}
            description="VAPID private key for Web Push (keep secret)"
          />
          <EnvRow
            name="NEXT_PUBLIC_VAPID_PUBLIC_KEY"
            configured={Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)}
            description="Same as VAPID_PUBLIC_KEY but exposed to the browser for push subscription"
          />
        </div>
      </Card>

      {/* ── Editorial Boost Panel ──────────────────────────────────────────── */}
      <Card>
        <CardTitle>Editorial Boosts</CardTitle>
        <CardSubtitle>
          Pin or boost specific matches in the Featured Events section.
          Requires ADMIN_SECRET to be set in .env.local.
        </CardSubtitle>
        <BoostPanel />
      </Card>
    </div>
  )
}
