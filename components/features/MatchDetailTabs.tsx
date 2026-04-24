"use client"

import { useState } from "react"
import Image from "next/image"
import type { Match } from "@/types/match"
import { cn } from "@/lib/utils/cn"
import { MatchStatBar } from "@/components/primitives/MatchStatBar"
import { Sparkline } from "@/components/primitives/Sparkline"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { MatchTips } from "@/components/features/MatchTips"
import { PlayerStatsPanel } from "@/components/features/PlayerStatsPanel"
import { MomentumGraph } from "@/components/features/MomentumGraph"
import { LineupDisplay } from "@/components/features/LineupDisplay"

type Tab = "tips" | "lineup" | "overview" | "stats" | "players" | "timeline" | "h2h" | "odds" | "squad"

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "tips",     label: "Tips" },
  { key: "lineup",   label: "Lineup" },
  { key: "overview", label: "Overview" },
  { key: "stats",    label: "Stats" },
  { key: "players",  label: "Players" },
  { key: "timeline", label: "Timeline" },
  { key: "h2h",      label: "H2H" },
  { key: "odds",     label: "Odds" },
  { key: "squad",    label: "Squad" },
]

interface MatchDetailTabsProps {
  match: Match
}

export function MatchDetailTabs({ match }: MatchDetailTabsProps) {
  const [tab, setTab] = useState<Tab>("tips")
  const fmt = useFormatOdds()

  return (
    <div>
      <div className="md-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={cn("md-tab", tab === t.key && "md-tab--active")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "var(--space-5) 0" }}>

        {/* ── Tips ── */}
        {tab === "tips" && <MatchTips match={match} />}

        {/* ── Lineup ── */}
        {tab === "lineup" && (
          match.lineup
            ? <LineupDisplay lineup={match.lineup} homeTeam={match.home.name} awayTeam={match.away.name} />
            : <p className="md-text-muted">Lineups not yet announced — usually released 60 min before kickoff.</p>
        )}

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

            {/* Coaches */}
            {match.coaches && (match.coaches.home || match.coaches.away) && (
              <div>
                <h4 className="insight-section-title">Managers</h4>
                <div className="coach-cards">
                  {[
                    { side: "home", coach: match.coaches.home, team: match.home.name },
                    { side: "away", coach: match.coaches.away, team: match.away.name },
                  ].map(({ side, coach, team }) => (
                    <div key={side} className="coach-card">
                      <div className="coach-card-header">
                        {coach?.photo
                          ? <Image src={coach.photo} alt={coach.name ?? "Coach"} width={44} height={44} className="coach-photo" unoptimized />
                          : <div className="coach-photo-placeholder">👤</div>
                        }
                        <div>
                          <div className="coach-info-team">{team}</div>
                          <div className="coach-info-name">{coach?.name ?? "Unknown"}</div>
                          <div className="coach-info-meta">
                            {[coach?.nationality, coach?.age ? `Age ${coach.age}` : null].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                      {coach?.career && coach.career.length > 0 && (
                        <div className="coach-career">
                          <div className="coach-career-title">Career</div>
                          {coach.career.slice(0, 4).map((c, i) => (
                            <div key={i} className="coach-career-row">
                              <span className="coach-career-club">{c.teamName}</span>
                              <span className="coach-career-dates">{c.start.slice(0, 4)}{c.end ? `–${c.end.slice(0, 4)}` : "–now"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Injuries */}
            {match.injuries && match.injuries.length > 0 && (
              <div>
                <h4 className="insight-section-title">Injuries</h4>
                <table className="md-table">
                  <thead><tr><th>Player</th><th>Team</th><th>Type</th><th>Reason</th></tr></thead>
                  <tbody>
                    {match.injuries.map((inj, i) => (
                      <tr key={i}>
                        <td>{inj.playerName}</td>
                        <td>{inj.team === "home" ? match.home.name : match.away.name}</td>
                        <td>{inj.type}</td>
                        <td className="md-text-muted">{inj.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Stats ── */}
        {tab === "stats" && (
          match.stats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <MatchStatBar label="Possession" home={match.stats.possession.h} away={match.stats.possession.a} unit="%" />
              <MatchStatBar label="Shots" home={match.stats.shots.h} away={match.stats.shots.a} />
              <MatchStatBar label="On Target" home={match.stats.shotsOnTarget.h} away={match.stats.shotsOnTarget.a} />
              {match.stats.shotsInsideBox && <MatchStatBar label="Inside Box" home={match.stats.shotsInsideBox.h} away={match.stats.shotsInsideBox.a} />}
              {match.stats.shotsOutsideBox && <MatchStatBar label="Outside Box" home={match.stats.shotsOutsideBox.h} away={match.stats.shotsOutsideBox.a} />}
              {match.stats.shotsBlocked && <MatchStatBar label="Blocked" home={match.stats.shotsBlocked.h} away={match.stats.shotsBlocked.a} />}
              <MatchStatBar label="xG" home={match.stats.xg.h} away={match.stats.xg.a} />
              <MatchStatBar label="Pass Acc." home={match.stats.passAccuracy.h} away={match.stats.passAccuracy.a} unit="%" />
              <MatchStatBar label="Corners" home={match.stats.corners.h} away={match.stats.corners.a} />
              {match.stats.fouls && <MatchStatBar label="Fouls" home={match.stats.fouls.h} away={match.stats.fouls.a} />}
              {match.stats.offsides && <MatchStatBar label="Offsides" home={match.stats.offsides.h} away={match.stats.offsides.a} />}
              {match.stats.yellowCards && <MatchStatBar label="Yellow Cards" home={match.stats.yellowCards.h} away={match.stats.yellowCards.a} />}
              {match.stats.redCards && <MatchStatBar label="Red Cards" home={match.stats.redCards.h} away={match.stats.redCards.a} />}
              {match.events.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <MomentumGraph events={match.events} homeTeam={match.home.short} awayTeam={match.away.short} />
                </div>
              )}
            </div>
          ) : <p className="md-text-muted">No statistics available yet.</p>
        )}

        {/* ── Players ── */}
        {tab === "players" && (
          match.playerRatings
            ? <PlayerStatsPanel playerRatings={match.playerRatings} homeTeam={match.home.name} awayTeam={match.away.name} />
            : <p className="md-text-muted">Player ratings not available for this match.</p>
        )}

        {/* ── Timeline ── */}
        {tab === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {match.events.length === 0 && <p className="md-text-muted">No events yet.</p>}
            {match.events.map((ev, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 24px 1fr", gap: 8, padding: 8, background: "var(--surface-2)", borderRadius: 8, fontSize: 13 }}>
                <span className="md-mono md-text-muted">{ev.minute}&apos;</span>
                <span>{ev.type === "goal" ? "⚽" : ev.type === "card" ? "🟨" : ev.type === "sub" ? "🔄" : "↔"}</span>
                <span><strong>{ev.player}</strong> · <span className="md-text-muted">{ev.detail}</span></span>
              </div>
            ))}
          </div>
        )}

        {/* ── H2H ── */}
        {tab === "h2h" && (
          !match.h2h || match.h2h.length === 0
            ? <p className="md-text-muted">No head-to-head history.</p>
            : (
              <table className="md-table">
                <thead><tr><th>Date</th><th>Match</th><th>Score</th></tr></thead>
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
            )
        )}

        {/* ── Odds ── */}
        {tab === "odds" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h4 className="insight-section-title">Bookmaker Comparison</h4>
            {match.bookmakerOdds.length === 0
              ? <p className="md-text-muted">No odds available.</p>
              : (
                <table className="md-table">
                  <thead><tr><th>Bookmaker</th><th>1</th><th>X</th><th>2</th></tr></thead>
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
              )
            }
            {match.marketHistory.length > 0 && (
              <div>
                <h4 className="insight-section-title">Market Movement (Home)</h4>
                <Sparkline values={match.marketHistory.map((p) => p.home)} height={64} />
              </div>
            )}
          </div>
        )}

        {/* ── Squad (trophies + sidelined + transfers) ── */}
        {tab === "squad" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Trophies */}
            <div>
              <h4 className="insight-section-title">🏆 Honours</h4>
              {!match.trophies
                ? <p className="md-text-muted">No trophy data.</p>
                : (
                  <div className="trophies-wrap">
                    {[
                      { label: match.home.name, list: match.trophies.home ?? [] },
                      { label: match.away.name, list: match.trophies.away ?? [] },
                    ].map(({ label, list }) => (
                      <div key={label} className="trophies-col">
                        <div className="trophies-team-label">{label}</div>
                        {list.length === 0
                          ? <p className="md-text-muted" style={{ fontSize: 12 }}>No data</p>
                          : list.filter((t) => t.place === "Winner").slice(0, 8).map((t, i) => (
                            <div key={i} className="trophy-item">
                              <span className="trophy-icon">🏆</span>
                              <div className="trophy-info">
                                <div className="trophy-league">{t.league}</div>
                                <div className="trophy-season">{t.country} · {t.season}</div>
                              </div>
                              <span className={cn("trophy-place", t.place === "Winner" ? "trophy-place--winner" : "trophy-place--runner")}>
                                {t.place}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            {/* Sidelined */}
            {match.sidelined && (match.sidelined.home?.length || match.sidelined.away?.length) ? (
              <div>
                <h4 className="insight-section-title">🚑 Long-term Absent</h4>
                <div className="sidelined-wrap">
                  {[
                    { label: match.home.name, list: match.sidelined.home ?? [] },
                    { label: match.away.name, list: match.sidelined.away ?? [] },
                  ].map(({ label, list }) => list.length > 0 && (
                    <div key={label}>
                      <div className="sidelined-team-label">{label}</div>
                      {list.map((s, i) => (
                        <div key={i} className="sidelined-item">
                          {s.playerPhoto
                            ? <Image src={s.playerPhoto} alt={s.playerName} width={32} height={32} className="sidelined-photo" unoptimized />
                            : <div className="sidelined-photo" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>
                          }
                          <div className="sidelined-info">
                            <div className="sidelined-name">{s.playerName}</div>
                            <div className="sidelined-type">{s.type}</div>
                          </div>
                          <div className="sidelined-dates">
                            {s.start.slice(0, 10)}{s.end ? ` → ${s.end.slice(0, 10)}` : " → ongoing"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Transfers */}
            {match.transfers && (match.transfers.home?.length || match.transfers.away?.length) ? (
              <div>
                <h4 className="insight-section-title">🔄 Recent Transfers</h4>
                <div className="transfers-wrap">
                  {[
                    { label: match.home.name, list: match.transfers.home ?? [] },
                    { label: match.away.name, list: match.transfers.away ?? [] },
                  ].map(({ label, list }) => list.length > 0 && (
                    <div key={label}>
                      <div className="transfers-team-label">{label}</div>
                      {list.map((t, i) => (
                        <div key={i} className="transfer-item">
                          <span className="transfer-player">{t.playerName}</span>
                          <div className="transfer-teams">
                            <span>{t.teamOut}</span>
                            <span className="transfer-arrow">→</span>
                            <span>{t.teamIn}</span>
                          </div>
                          <span className="transfer-type">{t.type}</span>
                          <span className="transfer-date">{t.date.slice(0, 10)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

          </div>
        )}

      </div>
    </div>
  )
}
