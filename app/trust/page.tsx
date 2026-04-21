"use client"

import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardTitle, CardSubtitle } from "@/components/primitives/Card"
import { fetchSignalHistory } from "@/lib/services/signals"
import type { SignalDataState } from "@/lib/services/signals"
import type { SignalRecord } from "@/types/trust"
import {
  computeModelSummary,
  computeTierPerformance,
  computeCalibration,
  computeValueSpotRecord,
  computeRecentSummary,
  computeLeagueBreakdown,
} from "@/lib/utils/signal-performance"

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmt1(n: number) {
  return n.toFixed(1)
}
function fmtPct(n: number) {
  return `${n.toFixed(1)}%`
}
function fmtRoi(n: number) {
  const sign = n >= 0 ? "+" : ""
  return `${sign}${n.toFixed(1)}%`
}
function fmtDate(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function roiClass(roi: number) {
  if (roi > 0) return "trust-pos"
  if (roi < 0) return "trust-neg"
  return "trust-neu"
}

function hitClass(hr: number) {
  if (hr >= 60) return "trust-pos"
  if (hr < 45) return "trust-neg"
  return "trust-neu"
}

// ── Calibration chart ─────────────────────────────────────────────────────────

interface CalibrationPoint {
  label: string
  midpoint: number
  totalSignals: number
  hitRate: number
  calibrationError: number
}

function CalibrationChart({ points }: { points: CalibrationPoint[] }) {
  if (points.length === 0) return null

  return (
    <div className="trust-calibration">
      <div className="trust-calibration-chart" aria-label="Calibration chart">
        {points.map((pt) => {
          const barH = Math.round(pt.hitRate)
          const idealH = Math.round(pt.midpoint)
          const err = pt.calibrationError
          const errClass = err <= 8 ? "trust-cal-bar--good" : err <= 15 ? "trust-cal-bar--ok" : "trust-cal-bar--poor"
          return (
            <div key={pt.label} className="trust-cal-col" title={`${pt.label}: ${fmtPct(pt.hitRate)} hit rate (${pt.totalSignals} signals)`}>
              <div className="trust-cal-bar-wrap">
                <div
                  className="trust-cal-ideal"
                  style={{ bottom: `${idealH}%` }}
                  aria-hidden
                />
                <div
                  className={`trust-cal-bar ${errClass}`}
                  style={{ height: `${barH}%` }}
                />
              </div>
              <div className="trust-cal-label">{pt.label.replace("%", "")}</div>
              <div className="trust-cal-count">{pt.totalSignals}</div>
            </div>
          )
        })}
      </div>
      <div className="trust-calibration-legend">
        <span className="trust-cal-legend-item">
          <span className="trust-cal-legend-ideal" /> Ideal (confidence = hit rate)
        </span>
        <span className="trust-cal-legend-item">
          <span className="trust-cal-legend-bar trust-cal-bar--good" /> Well-calibrated (≤8% error)
        </span>
        <span className="trust-cal-legend-item">
          <span className="trust-cal-legend-bar trust-cal-bar--ok" /> Acceptable (≤15% error)
        </span>
        <span className="trust-cal-legend-item">
          <span className="trust-cal-legend-bar trust-cal-bar--poor" /> Off (&gt;15% error)
        </span>
      </div>
    </div>
  )
}

// ── Stat box ──────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="trust-stat-box">
      <div className={`trust-stat-value ${valueClass ?? ""}`}>{value}</div>
      <div className="trust-stat-label">{label}</div>
      {sub && <div className="trust-stat-sub">{sub}</div>}
    </div>
  )
}

// ── Data source banner ────────────────────────────────────────────────────────

function DataSourceBanner({
  state,
  total,
  totalRecorded,
}: {
  state: SignalDataState
  total: number
  totalRecorded: number
}) {
  if (state === "live") {
    return (
      <div className="trust-source-banner trust-source-banner--real">
        <span className="trust-source-icon">✓</span>
        <div>
          <strong>Live track record</strong> — {total.toLocaleString()} real signals from completed
          matches. Predictions were locked before kick-off and never revised retroactively.
        </div>
      </div>
    )
  }

  if (state === "collecting") {
    return (
      <div className="trust-source-banner trust-source-banner--collecting">
        <span className="trust-source-icon">⏳</span>
        <div>
          <strong>Collecting signals</strong> — {totalRecorded.toLocaleString()} signal
          {totalRecorded === 1 ? "" : "s"} recorded so far, but no match outcomes have been
          resolved yet. The track record will appear once watched matches have finished and
          outcomes are confirmed. Stats below are sample data for illustration.
        </div>
      </div>
    )
  }

  // "no_data"
  return (
    <div className="trust-source-banner trust-source-banner--demo">
      <span className="trust-source-icon">🔬</span>
      <div>
        <strong>Sample data</strong> — No signal history is stored yet. This page shows simulated
        figures to illustrate what the Track Record will look like once AreBet has collected and
        resolved enough match signals. All figures below are for demonstration only.
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LEAGUES = ["All", "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"]

interface PageDataState {
  status: "loading" | "ready"
  records: SignalRecord[]
  signalState: SignalDataState
  total: number
  totalRecorded: number
}

export default function TrustPage() {
  const [leagueFilter, setLeagueFilter] = useState("All")
  const [dataState, setPageDataState] = useState<PageDataState>({
    status: "loading",
    records: [],
    signalState: "no_data",
    total: 0,
    totalRecorded: 0,
  })

  useEffect(() => {
    let cancelled = false
    fetchSignalHistory({ limit: 500 }).then((result) => {
      if (cancelled) return
      setPageDataState({
        status: "ready",
        records: result.records,
        signalState: result.state,
        total: result.total,
        totalRecorded: result.totalRecorded,
      })
    })
    return () => { cancelled = true }
  }, [])

  const allRecords = dataState.records
  const signalState = dataState.signalState
  const totalRecords = dataState.total
  const totalRecorded = dataState.totalRecorded

  const filtered = useMemo(
    () => (leagueFilter === "All" ? allRecords : allRecords.filter((r) => r.league === leagueFilter)),
    [leagueFilter, allRecords],
  )

  const summary = useMemo(() => computeModelSummary(filtered, signalState !== "live"), [filtered, signalState])
  const tiers = useMemo(() => computeTierPerformance(filtered), [filtered])
  const calibration = useMemo(() => computeCalibration(filtered), [filtered])
  const valueRecord = useMemo(() => computeValueSpotRecord(filtered), [filtered])
  const recentSummary = useMemo(() => computeRecentSummary(filtered, 14), [filtered])
  const leagueBreakdown = useMemo(() => computeLeagueBreakdown(allRecords), [allRecords])

  // Derive league options from actual data (real data may have different leagues)
  const availableLeagues = useMemo(() => {
    const set = new Set(allRecords.map((r) => r.league))
    return ["All", ...LEAGUES.slice(1).filter((l) => set.has(l)), ...Array.from(set).filter((l) => !LEAGUES.includes(l))]
  }, [allRecords])

  if (dataState.status === "loading") {
    return (
      <div className="md-page">
        <PageHeader title="Track Record" subtitle="How AreBet signals have performed on completed matches" />
        <div className="trust-loading">Loading signal history…</div>
      </div>
    )
  }

  return (
    <div className="md-page">
      <PageHeader
        title="Track Record"
        subtitle="How AreBet signals have performed on completed matches"
      />

      {/* Data source banner — always visible; wording reflects actual data state */}
      <DataSourceBanner state={signalState} total={totalRecords} totalRecorded={totalRecorded} />

      {/* League filter */}
      <div className="trust-filter-row">
        {availableLeagues.map((l) => (
          <button
            key={l}
            type="button"
            className={`trust-filter-btn${leagueFilter === l ? " trust-filter-btn--active" : ""}`}
            onClick={() => setLeagueFilter(l)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── Overall summary ──────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Overall Performance</CardTitle>
        <CardSubtitle>
          {summary.totalSignals} completed signals · {fmtDate(summary.dataFrom)} – {fmtDate(summary.dataTo)}
        </CardSubtitle>

        <div className="trust-stat-grid">
          <StatBox
            label="Hit rate"
            value={fmtPct(summary.hitRate)}
            sub={`${summary.correctSignals} of ${summary.totalSignals} correct`}
            valueClass={hitClass(summary.hitRate)}
          />
          <StatBox
            label="Avg confidence"
            value={fmtPct(summary.avgConfidence)}
            sub="Mean pre-match signal strength"
          />
          <StatBox
            label="Avg odds"
            value={fmt1(summary.avgOdds)}
            sub="Decimal odds at time of signal"
          />
          <StatBox
            label="Flat-stake ROI"
            value={fmtRoi(summary.roi)}
            sub="£1 on every signal"
            valueClass={roiClass(summary.roi)}
          />
        </div>

        {recentSummary.totalSignals > 0 && (
          <div className="trust-recent-strip">
            <span className="trust-recent-label">Last 14 days</span>
            <span className="trust-recent-stat">
              <span className={hitClass(recentSummary.hitRate)}>{fmtPct(recentSummary.hitRate)}</span> hit rate
            </span>
            <span className="trust-recent-divider" />
            <span className="trust-recent-stat">
              <span className={roiClass(recentSummary.roi)}>{fmtRoi(recentSummary.roi)}</span> ROI
            </span>
            <span className="trust-recent-divider" />
            <span className="trust-recent-stat">{recentSummary.totalSignals} signals</span>
          </div>
        )}
      </Card>

      {/* ── Tier performance ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Performance by Confidence Tier</CardTitle>
        <CardSubtitle>How signal accuracy varies by the model's stated confidence level</CardSubtitle>

        <div className="trust-tier-table-wrap">
          <table className="trust-tier-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Signals</th>
                <th>Hit rate</th>
                <th>Avg confidence</th>
                <th>Avg odds</th>
                <th>Flat ROI</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.tier} className={`trust-tier-row trust-tier-row--${t.tier}`}>
                  <td>
                    <span className={`trust-tier-pill trust-tier-pill--${t.tier}`}>{t.label}</span>
                  </td>
                  <td>{t.totalSignals}</td>
                  <td>
                    <span className={hitClass(t.hitRate)}>{fmtPct(t.hitRate)}</span>
                  </td>
                  <td>{fmtPct(t.avgConfidence)}</td>
                  <td>{t.avgOdds > 0 ? fmt1(t.avgOdds) : "—"}</td>
                  <td>
                    <span className={roiClass(t.roi)}>{t.totalSignals > 0 ? fmtRoi(t.roi) : "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="trust-table-note">
          ROI assumes a flat £1 stake on every signal in the tier, at the odds available when the signal was generated.
        </p>
      </Card>

      {/* ── Calibration chart ────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Confidence Calibration</CardTitle>
        <CardSubtitle>
          A well-calibrated model: when it says 70%, it's right ~70% of the time.
          Bars represent actual hit rate per confidence band.
        </CardSubtitle>
        <CalibrationChart points={calibration} />
      </Card>

      {/* ── Value spot track record ──────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Value Spot Track Record</CardTitle>
        <CardSubtitle>
          Signals where the model detected a positive expected-value edge vs market odds (≥5% edge threshold)
        </CardSubtitle>

        {valueRecord.totalFlagged > 0 ? (
          <div className="trust-value-grid">
            <StatBox
              label="Value flags"
              value={String(valueRecord.totalFlagged)}
              sub={`of ${summary.totalSignals} total signals`}
            />
            <StatBox
              label="Hit rate"
              value={fmtPct(valueRecord.hitRate)}
              sub={`${valueRecord.profitableCount} profitable`}
              valueClass={hitClass(valueRecord.hitRate)}
            />
            <StatBox
              label="Avg edge"
              value={`+${fmt1(valueRecord.avgEdgePct)}%`}
              sub="Model edge vs fair odds"
              valueClass="trust-pos"
            />
            <StatBox
              label="Value ROI"
              value={fmtRoi(valueRecord.roi)}
              sub="Flat stake on value flags only"
              valueClass={roiClass(valueRecord.roi)}
            />
          </div>
        ) : (
          <div className="md-text-muted">No value spots in this sample.</div>
        )}
      </Card>

      {/* ── League breakdown ─────────────────────────────────────────────── */}
      {leagueFilter === "All" && leagueBreakdown.length > 0 && (
        <Card className="mb-6">
          <CardTitle>By League</CardTitle>
          <CardSubtitle>Signal accuracy across the competitions AreBet covers</CardSubtitle>

          <div className="trust-league-table-wrap">
            <table className="trust-league-table">
              <thead>
                <tr>
                  <th>League</th>
                  <th>Signals</th>
                  <th>Hit rate</th>
                  <th>Avg confidence</th>
                  <th>Flat ROI</th>
                </tr>
              </thead>
              <tbody>
                {leagueBreakdown.map((l) => (
                  <tr key={l.league}>
                    <td>{l.league}</td>
                    <td>{l.totalSignals}</td>
                    <td>
                      <span className={hitClass(l.hitRate)}>{fmtPct(l.hitRate)}</span>
                    </td>
                    <td>{fmtPct(l.avgConfidence)}</td>
                    <td>
                      <span className={roiClass(l.roi)}>{fmtRoi(l.roi)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Methodology ──────────────────────────────────────────────────── */}
      <Card>
        <CardTitle>How Signals Are Generated</CardTitle>
        <CardSubtitle>Full transparency on the AreBet model</CardSubtitle>

        <div className="trust-method">
          <div className="trust-method-section">
            <h3 className="trust-method-h">What is a signal?</h3>
            <p>
              A signal is a match prediction generated before kick-off. Each signal states a predicted
              outcome (Home Win, Draw, or Away Win), a confidence percentage, and — where applicable
              — a value edge flag. Signals are locked the moment they are stored; we do not revise
              them retroactively.
            </p>
          </div>

          <div className="trust-method-section">
            <h3 className="trust-method-h">Confidence score</h3>
            <p>
              Confidence (0–100%) is the model's estimated probability that the predicted outcome
              resolves correctly. It's derived from a weighted combination of:
            </p>
            <ul className="trust-method-list">
              <li>Recent form (last 5 matches, home/away split)</li>
              <li>Head-to-head record (last 5 meetings)</li>
              <li>Expected goals (xG) season averages</li>
              <li>Current league position and points gap</li>
              <li>Goals scored / conceded per game</li>
              <li>Clean sheet rates and defensive stability metrics</li>
            </ul>
          </div>

          <div className="trust-method-section">
            <h3 className="trust-method-h">Value edge detection</h3>
            <p>
              Market odds contain a bookmaker margin (overround). AreBet strips this margin to compute
              the fair implied probability, then compares it to the model's probability:
            </p>
            <div className="trust-method-formula">
              Edge% = (Model probability − Fair implied probability) × 100
            </div>
            <p>
              A value edge is flagged when Edge% ≥ 5. This measures disagreement between AreBet's
              model and the market — it is not a guarantee of profit.
            </p>
          </div>

          <div className="trust-method-section">
            <h3 className="trust-method-h">Confidence tiers</h3>
            <ul className="trust-method-list">
              <li><strong>High (≥72%)</strong> — Model strongly favours the predicted outcome. Lower variance, tighter range of acceptable odds.</li>
              <li><strong>Mid (50–71%)</strong> — Model has a meaningful lean but uncertainty is higher.</li>
              <li><strong>Low (&lt;50%)</strong> — Contrarian or speculative signals. Model sees something the market may have missed, but hit rate is below coin-flip.</li>
            </ul>
          </div>

          <div className="trust-method-section">
            <h3 className="trust-method-h">ROI calculation</h3>
            <p>
              All ROI figures assume a flat £1 stake on every signal at the decimal odds shown at
              signal generation time. No staking system is applied — this is the most conservative,
              honest presentation.
            </p>
          </div>

          <div className="trust-method-section">
            <h3 className="trust-method-h">What this data is not</h3>
            <p>
              AreBet is a decision-support tool, not a tipster service. Past signal accuracy does
              not guarantee future results. Betting involves financial risk — always gamble
              responsibly. Track records shown here are for transparency about model performance,
              not as investment advice or guaranteed returns.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
