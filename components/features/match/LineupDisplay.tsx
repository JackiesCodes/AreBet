"use client"

import { useState } from "react"
import type { MatchLineup, LineupPlayer } from "@/types/match"
import { cn } from "@/lib/utils/cn"

interface LineupDisplayProps {
  lineup: MatchLineup
  homeTeam: string
  awayTeam: string
}

// Parse grid string "row:col" — row 1 = GK line, higher rows = attack
function parseGrid(grid: string | null): { row: number; col: number } | null {
  if (!grid) return null
  const [r, c] = grid.split(":").map(Number)
  if (isNaN(r) || isNaN(c)) return null
  return { row: r, col: c }
}

// Group players by their grid row
function groupByRow(players: LineupPlayer[]): Map<number, LineupPlayer[]> {
  const map = new Map<number, LineupPlayer[]>()
  for (const p of players) {
    const g = parseGrid(p.grid)
    const row = g?.row ?? 99
    if (!map.has(row)) map.set(row, [])
    map.get(row)!.push(p)
  }
  // Sort players within each row by column
  for (const [, list] of map) {
    list.sort((a, b) => (parseGrid(a.grid)?.col ?? 0) - (parseGrid(b.grid)?.col ?? 0))
  }
  return map
}

function positionColor(pos: string): string {
  switch (pos.toUpperCase()) {
    case "G": return "var(--color-gk)"
    case "D": return "var(--color-def)"
    case "M": return "var(--color-mid)"
    case "F": return "var(--color-fwd)"
    default:  return "var(--surface-3)"
  }
}

function PlayerDot({ player, flip = false }: { player: LineupPlayer; flip?: boolean }) {
  return (
    <div className={cn("lu-player", flip && "lu-player--flip")} title={`${player.number}. ${player.name}`}>
      <div className="lu-dot" style={{ background: positionColor(player.position) }}>
        {player.number}
      </div>
      <span className="lu-name">{player.name.split(" ").pop()}</span>
    </div>
  )
}

function PitchHalf({ players, flip = false }: { players: LineupPlayer[]; flip?: boolean }) {
  const rows = groupByRow(players)
  const sortedRows = Array.from(rows.entries()).sort(([a], [b]) => (flip ? b - a : a - b))

  return (
    <div className="lu-half">
      {sortedRows.map(([row, rowPlayers]) => (
        <div key={row} className="lu-row">
          {rowPlayers.map((p) => (
            <PlayerDot key={p.id} player={p} flip={flip} />
          ))}
        </div>
      ))}
    </div>
  )
}

function SubstitutesTable({ players, label }: { players: LineupPlayer[]; label: string }) {
  if (players.length === 0) return null
  return (
    <div className="lu-subs-section">
      <div className="lu-subs-label">{label} Substitutes</div>
      <div className="lu-subs-grid">
        {players.map((p) => (
          <div key={p.id} className="lu-sub-item">
            <span className="lu-sub-num">{p.number}</span>
            <span className="lu-sub-name">{p.name}</span>
            <span className="lu-sub-pos" style={{ color: positionColor(p.position) }}>{p.position}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LineupDisplay({ lineup, homeTeam, awayTeam }: LineupDisplayProps) {
  const [view, setView] = useState<"pitch" | "list">("pitch")

  const hasLineups = lineup.home.startXI.length > 0 || lineup.away.startXI.length > 0

  if (!hasLineups) {
    return <p className="md-text-muted">Lineups not yet announced.</p>
  }

  return (
    <div className="lu-wrap">
      {/* Formation badges + view toggle */}
      <div className="lu-header">
        <div className="lu-formation-badge lu-formation-badge--home">
          <span className="lu-team-label">{homeTeam}</span>
          <span className="lu-formation">{lineup.home.formation}</span>
          {lineup.home.coach && <span className="lu-coach">Coach: {lineup.home.coach}</span>}
        </div>
        <div className="lu-view-toggle">
          <button type="button" className={cn("lu-toggle-btn", view === "pitch" && "lu-toggle-btn--active")} onClick={() => setView("pitch")}>Pitch</button>
          <button type="button" className={cn("lu-toggle-btn", view === "list" && "lu-toggle-btn--active")} onClick={() => setView("list")}>List</button>
        </div>
        <div className="lu-formation-badge lu-formation-badge--away">
          <span className="lu-team-label">{awayTeam}</span>
          <span className="lu-formation">{lineup.away.formation}</span>
          {lineup.away.coach && <span className="lu-coach">Coach: {lineup.away.coach}</span>}
        </div>
      </div>

      {view === "pitch" && (
        <div className="lu-pitch">
          <div className="lu-pitch-grass">
            <div className="lu-pitch-center-line" />
            <PitchHalf players={lineup.home.startXI} />
            <PitchHalf players={lineup.away.startXI} flip />
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="lu-list">
          <div className="lu-list-col">
            <div className="lu-list-header">{homeTeam}</div>
            {lineup.home.startXI.map((p) => (
              <div key={p.id} className="lu-list-row">
                <span className="lu-list-num">{p.number}</span>
                <span className="lu-list-pos" style={{ color: positionColor(p.position) }}>{p.position}</span>
                <span className="lu-list-name">{p.name}</span>
              </div>
            ))}
          </div>
          <div className="lu-list-col">
            <div className="lu-list-header">{awayTeam}</div>
            {lineup.away.startXI.map((p) => (
              <div key={p.id} className="lu-list-row">
                <span className="lu-list-num">{p.number}</span>
                <span className="lu-list-pos" style={{ color: positionColor(p.position) }}>{p.position}</span>
                <span className="lu-list-name">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Substitutes */}
      <div className="lu-subs-wrap">
        <SubstitutesTable players={lineup.home.substitutes} label={homeTeam} />
        <SubstitutesTable players={lineup.away.substitutes} label={awayTeam} />
      </div>
    </div>
  )
}
