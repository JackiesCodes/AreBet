"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { Match } from "@/types/match"
import { Sparkline } from "@/components/primitives/Sparkline"
import { Badge } from "@/components/primitives/Badge"
import { ConfidenceHeat } from "@/components/primitives/ConfidenceHeat"
import { MatchStatBar } from "@/components/primitives/MatchStatBar"
import { FormGuide } from "@/components/primitives/FormGuide"
import { EmptyState } from "@/components/primitives/EmptyState"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { formatTime } from "@/lib/utils/time"
import { calculateValueEdge, buildPredictionFactors } from "@/lib/utils/value-bet"

interface MatchInsightPanelProps {
  match: Match | null
}

export function MatchInsightPanel({ match }: MatchInsightPanelProps) {
  const fmt = useFormatOdds()

  const valueEdge = useMemo(() => (match ? calculateValueEdge(match) : null), [match])
  const factors = useMemo(
    () => (match ? (match.prediction.factors ?? buildPredictionFactors(match)) : []),
    [match],
  )

  // Inject factors into match prediction for the render below
  const enrichedMatch = useMemo(
    () => (match ? { ...match, prediction: { ...match.prediction, factors } } : match),
    [match, factors],
  )

  if (!enrichedMatch) {
    return (
      <aside className="cc-insight">
        <div className="cc-section-head">
          <span className="cc-section-title">Insight</span>
        </div>
        <EmptyState title="Select a match" text="Click any match in the feed to see live stats, odds and timeline." />
      </aside>
    )
  }

  const homeHistory = enrichedMatch.marketHistory.map((p) => p.home)

  return (
    <aside className="cc-insight">
      <div className="insight-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Badge tone={enrichedMatch.status === "LIVE" ? "live" : enrichedMatch.status === "FINISHED" ? "finished" : "upcoming"}>
            {enrichedMatch.status === "LIVE" ? `LIVE · ${enrichedMatch.minute}'` : enrichedMatch.status === "FINISHED" ? "FT" : formatTime(enrichedMatch.kickoffISO)}
          </Badge>
          <span className="md-text-muted" style={{ fontSize: 11 }}>{enrichedMatch.league}</span>
        </div>
        <div className="insight-teams" style={{ marginTop: 12 }}>
          <div className="insight-team">
            <span>{enrichedMatch.home.name}</span>
            <FormGuide form={enrichedMatch.home.form} />
          </div>
          <div className="insight-vs md-mono">
            {enrichedMatch.score.home} – {enrichedMatch.score.away}
          </div>
          <div className="insight-team" style={{ alignItems: "flex-end", textAlign: "right" }}>
            <span>{enrichedMatch.away.name}</span>
            <FormGuide form={enrichedMatch.away.form} />
          </div>
        </div>
      </div>
      <div className="insight-body">
        <section className="insight-section">
          <h4 className="insight-section-title">Confidence</h4>
          <ConfidenceHeat value={enrichedMatch.prediction.confidence} />
          <p className="md-text-secondary" style={{ fontSize: 12, marginTop: 8 }}>{enrichedMatch.prediction.advice}</p>
          {valueEdge && (
            <div style={{ marginTop: 10 }}>
              {valueEdge.isValue ? (
                <div className="value-analysis value-analysis--positive">
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                    ▲ Value Bet Detected — {valueEdge.selection.toUpperCase()} @ {fmt(valueEdge.odds)}
                  </div>
                  <div style={{ fontSize: 11 }} className="md-mono">
                    Model: {(valueEdge.modelProb * 100).toFixed(1)}% &nbsp;|&nbsp;
                    Market: {(valueEdge.impliedProb * 100).toFixed(1)}% &nbsp;|&nbsp;
                    Edge: +{(valueEdge.edge * 100).toFixed(1)}%
                  </div>
                </div>
              ) : (
                <div className="value-analysis value-analysis--neutral">
                  <div style={{ fontSize: 11 }} className="md-text-muted">
                    No value edge detected (best: {(valueEdge.edge * 100).toFixed(1)}%, need ≥5%)
                  </div>
                </div>
              )}
            </div>
          )}
          {enrichedMatch.prediction.factors && enrichedMatch.prediction.factors.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }} className="md-text-muted">
                Why this prediction
              </div>
              {enrichedMatch.prediction.factors.map((f, i) => (
                <div key={i} className={`prediction-factor prediction-factor--${f.impact}`}>
                  <span className="prediction-factor__icon">
                    {f.impact === "positive" ? "+" : f.impact === "negative" ? "−" : "·"}
                  </span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{f.label}</div>
                    <div style={{ fontSize: 10 }} className="md-text-muted">{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {enrichedMatch.stats && (
          <section className="insight-section">
            <h4 className="insight-section-title">Match Stats</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <MatchStatBar label="Possession" home={enrichedMatch.stats.possession.h} away={enrichedMatch.stats.possession.a} unit="%" />
              <MatchStatBar label="Shots" home={enrichedMatch.stats.shots.h} away={enrichedMatch.stats.shots.a} />
              <MatchStatBar label="On Target" home={enrichedMatch.stats.shotsOnTarget.h} away={enrichedMatch.stats.shotsOnTarget.a} />
              <MatchStatBar label="xG" home={enrichedMatch.stats.xg.h} away={enrichedMatch.stats.xg.a} />
              <MatchStatBar label="Corners" home={enrichedMatch.stats.corners.h} away={enrichedMatch.stats.corners.a} />
            </div>
          </section>
        )}

        <section className="insight-section">
          <h4 className="insight-section-title">Odds Movement</h4>
          <Sparkline values={homeHistory} />
          <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 11 }} className="md-mono">
            <span>1: {fmt(enrichedMatch.odds.home)}</span>
            <span>X: {fmt(enrichedMatch.odds.draw)}</span>
            <span>2: {fmt(enrichedMatch.odds.away)}</span>
          </div>
        </section>

        {enrichedMatch.events.length > 0 && (
          <section className="insight-section">
            <h4 className="insight-section-title">Timeline</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              {enrichedMatch.events.slice(-6).reverse().map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <span className="md-mono md-text-muted">{ev.minute}'</span>
                  <span>{ev.type === "goal" ? "⚽" : ev.type === "card" ? "🟨" : "↔"}</span>
                  <span>{ev.player}</span>
                  <span className="md-text-muted">{ev.detail}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <Link href={`/match/${enrichedMatch.id}`} className="md-btn md-btn--primary md-btn--block">
          Open Full Match
        </Link>
      </div>
    </aside>
  )
}
