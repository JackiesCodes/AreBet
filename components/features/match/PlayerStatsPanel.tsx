"use client"

import { useState } from "react"
import type { PlayerRating, PlayerRatings } from "@/types/match"
import { cn } from "@/lib/utils/cn"

type SortKey = "rating" | "minutes" | "goals" | "assists" | "shots" | "keyPasses" | "tackles" | "passAccuracy"

interface PlayerStatsPanelProps {
  playerRatings: PlayerRatings
  homeTeam: string
  awayTeam: string
}

function RatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 8 ? "var(--color-success)" :
    rating >= 7 ? "var(--color-warning, #f59e0b)" :
    rating >= 6 ? "var(--color-text-secondary)" :
    "var(--color-danger, #ef4444)"
  return (
    <span className="psp-rating" style={{ color }}>
      {rating > 0 ? rating.toFixed(1) : "—"}
    </span>
  )
}

function fmt(val: number | undefined, unit = ""): string {
  if (val == null || val === undefined) return "—"
  return `${val}${unit}`
}

function fmtPct(val: number | undefined): string {
  if (val == null) return "—"
  return `${Math.round(val)}%`
}

function sortPlayers(players: PlayerRating[], key: SortKey, dir: 1 | -1): PlayerRating[] {
  return [...players].sort((a, b) => {
    const av = (a[key] ?? -1) as number
    const bv = (b[key] ?? -1) as number
    return (bv - av) * dir
  })
}

export function PlayerStatsPanel({ playerRatings, homeTeam, awayTeam }: PlayerStatsPanelProps) {
  const [side, setSide] = useState<"home" | "away">("home")
  const [sortKey, setSortKey] = useState<SortKey>("rating")
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const players = side === "home" ? playerRatings.home : playerRatings.away
  const sorted = sortPlayers(players, sortKey, sortDir)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  const colIcon = (key: SortKey) => {
    if (sortKey !== key) return null
    return sortDir === 1 ? " ↓" : " ↑"
  }

  const cols: Array<{ key: SortKey; label: string; title?: string }> = [
    { key: "rating", label: "Rtg", title: "Rating" },
    { key: "minutes", label: "Min", title: "Minutes played" },
    { key: "goals", label: "G", title: "Goals" },
    { key: "assists", label: "A", title: "Assists" },
    { key: "shots", label: "Sh", title: "Shots" },
    { key: "keyPasses", label: "KP", title: "Key passes" },
    { key: "passAccuracy", label: "Pass%", title: "Pass accuracy" },
    { key: "tackles", label: "Tkl", title: "Tackles" },
  ]

  return (
    <div className="psp-root">
      <div className="psp-toggle">
        <button
          className={cn("psp-toggle-btn", side === "home" && "psp-toggle-btn--active")}
          onClick={() => setSide("home")}
        >
          {homeTeam}
        </button>
        <button
          className={cn("psp-toggle-btn", side === "away" && "psp-toggle-btn--active")}
          onClick={() => setSide("away")}
        >
          {awayTeam}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="md-text-muted psp-empty">No player data available.</p>
      ) : (
        <div className="psp-table-wrap">
          <table className="psp-table">
            <thead>
              <tr>
                <th className="psp-th-name">Player</th>
                <th className="psp-th-pos">Pos</th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className={cn("psp-th-stat", sortKey === c.key && "psp-th-stat--active")}
                    title={c.title}
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label}{colIcon(c.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={i} className={cn("psp-row", p.substitute && "psp-row--sub")}>
                  <td className="psp-cell-name">
                    {p.substitute && <span className="psp-sub-icon" title="Substitute">↔</span>}
                    {p.name}
                    {(p.yellowCards ?? 0) > 0 && <span className="psp-card psp-card--yellow" title="Yellow card" />}
                    {(p.redCards ?? 0) > 0 && <span className="psp-card psp-card--red" title="Red card" />}
                  </td>
                  <td className="psp-cell-pos">{p.position}</td>
                  <td className="psp-cell-stat"><RatingBadge rating={p.rating} /></td>
                  <td className="psp-cell-stat">{fmt(p.minutes)}</td>
                  <td className="psp-cell-stat">{fmt(p.goals)}</td>
                  <td className="psp-cell-stat">{fmt(p.assists)}</td>
                  <td className="psp-cell-stat">{fmt(p.shots)}</td>
                  <td className="psp-cell-stat">{fmt(p.keyPasses)}</td>
                  <td className="psp-cell-stat">{fmtPct(p.passAccuracy)}</td>
                  <td className="psp-cell-stat">{fmt(p.tackles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
