"use client"

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

interface MatchInsightPanelProps {
  match: Match | null
}

export function MatchInsightPanel({ match }: MatchInsightPanelProps) {
  const fmt = useFormatOdds()

  if (!match) {
    return (
      <aside className="cc-insight">
        <div className="cc-section-head">
          <span className="cc-section-title">Insight</span>
        </div>
        <EmptyState title="Select a match" text="Click any match in the feed to see live stats, odds and timeline." />
      </aside>
    )
  }

  const homeHistory = match.marketHistory.map((p) => p.home)

  return (
    <aside className="cc-insight">
      <div className="insight-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Badge tone={match.status === "LIVE" ? "live" : match.status === "FINISHED" ? "finished" : "upcoming"}>
            {match.status === "LIVE" ? `LIVE · ${match.minute}'` : match.status === "FINISHED" ? "FT" : formatTime(match.kickoffISO)}
          </Badge>
          <span className="md-text-muted" style={{ fontSize: 11 }}>{match.league}</span>
        </div>
        <div className="insight-teams" style={{ marginTop: 12 }}>
          <div className="insight-team">
            <span>{match.home.name}</span>
            <FormGuide form={match.home.form} />
          </div>
          <div className="insight-vs md-mono">
            {match.score.home} – {match.score.away}
          </div>
          <div className="insight-team" style={{ alignItems: "flex-end", textAlign: "right" }}>
            <span>{match.away.name}</span>
            <FormGuide form={match.away.form} />
          </div>
        </div>
      </div>
      <div className="insight-body">
        <section className="insight-section">
          <h4 className="insight-section-title">Confidence</h4>
          <ConfidenceHeat value={match.prediction.confidence} />
          <p className="md-text-secondary" style={{ fontSize: 12, marginTop: 8 }}>{match.prediction.advice}</p>
        </section>

        {match.stats && (
          <section className="insight-section">
            <h4 className="insight-section-title">Match Stats</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <MatchStatBar label="Possession" home={match.stats.possession.h} away={match.stats.possession.a} unit="%" />
              <MatchStatBar label="Shots" home={match.stats.shots.h} away={match.stats.shots.a} />
              <MatchStatBar label="On Target" home={match.stats.shotsOnTarget.h} away={match.stats.shotsOnTarget.a} />
              <MatchStatBar label="xG" home={match.stats.xg.h} away={match.stats.xg.a} />
              <MatchStatBar label="Corners" home={match.stats.corners.h} away={match.stats.corners.a} />
            </div>
          </section>
        )}

        <section className="insight-section">
          <h4 className="insight-section-title">Odds Movement</h4>
          <Sparkline values={homeHistory} />
          <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 11 }} className="md-mono">
            <span>1: {fmt(match.odds.home)}</span>
            <span>X: {fmt(match.odds.draw)}</span>
            <span>2: {fmt(match.odds.away)}</span>
          </div>
        </section>

        {match.events.length > 0 && (
          <section className="insight-section">
            <h4 className="insight-section-title">Timeline</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              {match.events.slice(-6).reverse().map((ev, i) => (
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

        <Link href={`/match/${match.id}`} className="md-btn md-btn--primary md-btn--block">
          Open Full Match
        </Link>
      </div>
    </aside>
  )
}
