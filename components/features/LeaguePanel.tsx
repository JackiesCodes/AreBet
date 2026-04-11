"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils/cn"
import type { Match, StatusFilter } from "@/types/match"

interface LeaguePanelProps {
  matches: Match[]
  activeLeague: string | null
  onSelectLeague: (league: string | null) => void
  quickFilter: StatusFilter
  onQuickFilter: (f: StatusFilter) => void
}

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "soon", label: "Soon" },
  { key: "favorites", label: "Watchlist" },
  { key: "high", label: "High Conf." },
]

export function LeaguePanel({ matches, activeLeague, onSelectLeague, quickFilter, onQuickFilter }: LeaguePanelProps) {
  const leagues = useMemo(() => {
    const map = new Map<string, { total: number; live: number }>()
    for (const m of matches) {
      const entry = map.get(m.league) ?? { total: 0, live: 0 }
      entry.total += 1
      if (m.status === "LIVE") entry.live += 1
      map.set(m.league, entry)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [matches])

  return (
    <aside className="cc-leagues">
      <div className="cc-section-head">
        <span className="cc-section-title">Leagues</span>
      </div>
      <div className="cc-pills">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={cn("cc-pill", quickFilter === f.key && "cc-pill--active")}
            onClick={() => onQuickFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="cc-section-body">
        <div
          className={cn("cc-league-row", activeLeague === null && "cc-league-row--active")}
          onClick={() => onSelectLeague(null)}
        >
          <div className="cc-league-row-left">
            <span className="cc-league-row-name">All Leagues</span>
          </div>
          <span className="cc-league-row-count">{matches.length}</span>
        </div>
        {leagues.map(([name, info]) => (
          <div
            key={name}
            className={cn("cc-league-row", activeLeague === name && "cc-league-row--active")}
            onClick={() => onSelectLeague(name)}
          >
            <div className="cc-league-row-left">
              <span className="cc-league-row-name">{name}</span>
            </div>
            <span className="cc-league-row-count">
              {info.live > 0 && <span className="md-text-positive">{info.live}● </span>}
              {info.total}
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
