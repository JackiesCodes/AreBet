"use client"

import { useState } from "react"
import type { Match } from "@/types/match"
import { cn } from "@/lib/utils/cn"
import { MatchStatBar } from "@/components/primitives/MatchStatBar"
import { Sparkline } from "@/components/primitives/Sparkline"
import { useFormatOdds } from "@/hooks/useFormatOdds"

type Tab = "overview" | "stats" | "timeline" | "h2h" | "odds"

interface MatchDetailTabsProps {
  match: Match
}

export function MatchDetailTabs({ match }: MatchDetailTabsProps) {
  const [tab, setTab] = useState<Tab>("overview")
  const fmt = useFormatOdds()

  return (
    <div>
      <div className="md-tabs" role="tablist">
        {(["overview", "stats", "timeline", "h2h", "odds"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={cn("md-tab", tab === t && "md-tab--active")}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ padding: "var(--space-5) 0" }}>
        {tab === "overview" && (
          <div>
            <h3 className="md-card-title">{match.prediction.advice}</h3>
            <p className="md-card-subtitle">
              Model confidence {Math.round(match.prediction.confidence)}%. Expected goals{" "}
              {match.prediction.expectedGoals.home} – {match.prediction.expectedGoals.away}.
            </p>
            <p className="md-text-secondary" style={{ fontSize: 13 }}>
              {match.venue}, {match.country}
            </p>
          </div>
        )}
        {tab === "stats" && match.stats && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MatchStatBar label="Possession" home={match.stats.possession.h} away={match.stats.possession.a} unit="%" />
            <MatchStatBar label="Shots" home={match.stats.shots.h} away={match.stats.shots.a} />
            <MatchStatBar label="On Target" home={match.stats.shotsOnTarget.h} away={match.stats.shotsOnTarget.a} />
            <MatchStatBar label="xG" home={match.stats.xg.h} away={match.stats.xg.a} />
            <MatchStatBar label="Pass Acc." home={match.stats.passAccuracy.h} away={match.stats.passAccuracy.a} unit="%" />
            <MatchStatBar label="Corners" home={match.stats.corners.h} away={match.stats.corners.a} />
          </div>
        )}
        {tab === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {match.events.length === 0 && <p className="md-text-muted">No events yet.</p>}
            {match.events.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 24px 1fr",
                  gap: 8,
                  padding: 8,
                  background: "var(--surface-2)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <span className="md-mono md-text-muted">{ev.minute}'</span>
                <span>{ev.type === "goal" ? "⚽" : ev.type === "card" ? "🟨" : "↔"}</span>
                <span>
                  <strong>{ev.player}</strong> · <span className="md-text-muted">{ev.detail}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {tab === "h2h" && (
          <div>
            {!match.h2h || match.h2h.length === 0 ? (
              <p className="md-text-muted">No head-to-head history.</p>
            ) : (
              <table className="md-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Match</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {match.h2h.map((h, i) => (
                    <tr key={i}>
                      <td className="md-mono">{h.date}</td>
                      <td>{h.home} vs {h.away}</td>
                      <td className="md-mono">{h.score.home}–{h.score.away}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {tab === "odds" && (
          <div>
            <h4 className="insight-section-title">Bookmaker Comparison</h4>
            <table className="md-table">
              <thead>
                <tr>
                  <th>Bookmaker</th>
                  <th>1</th>
                  <th>X</th>
                  <th>2</th>
                </tr>
              </thead>
              <tbody>
                {match.bookmakerOdds.map((b) => (
                  <tr key={b.bookmaker}>
                    <td>{b.bookmaker}</td>
                    <td className="md-mono">{fmt(b.home)}</td>
                    <td className="md-mono">{fmt(b.draw)}</td>
                    <td className="md-mono">{fmt(b.away)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16 }}>
              <h4 className="insight-section-title">Market Movement (Home)</h4>
              <Sparkline values={match.marketHistory.map((p) => p.home)} height={64} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
