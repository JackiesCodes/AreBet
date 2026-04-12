"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils/cn"
import { useFilters, LEAGUE_IDS, LEAGUE_NAMES, type GlobalStatusFilter } from "@/contexts/FilterContext"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"

const STATUS_OPTIONS: { key: GlobalStatusFilter; label: string }[] = [
  { key: "all", label: "All Matches" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
]

export function LeftSidebar() {
  const { matches } = useMatchIntelligence()
  const {
    enabledLeagues,
    statusFilter,
    toggleLeague,
    setStatusFilter,
    resetFilters,
    activeFilterCount,
  } = useFilters()

  const liveTotal = useMemo(() => matches.filter((m) => m.status === "LIVE").length, [matches])

  const leagueCounts = useMemo(() => {
    const map = new Map<string, { total: number; live: number }>()
    for (const m of matches) {
      const e = map.get(m.league) ?? { total: 0, live: 0 }
      e.total++
      if (m.status === "LIVE") e.live++
      map.set(m.league, e)
    }
    return map
  }, [matches])

  return (
    <aside className="app-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-header-title">Filters &amp; Options</span>
        {activeFilterCount > 0 && (
          <button type="button" className="sidebar-clear-btn" onClick={resetFilters}>
            Clear
          </button>
        )}
      </div>

      {/* League toggles */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Leagues &amp; Competitions</div>
        {LEAGUE_IDS.map((id) => {
          const name = LEAGUE_NAMES[id]
          const info = leagueCounts.get(name) ?? { total: 0, live: 0 }
          const isOn = enabledLeagues.size === 0 || enabledLeagues.has(id)
          return (
            <div key={id} className="sidebar-league-row">
              <div className="sidebar-league-info">
                <span className="sidebar-league-name">{name}</span>
                {info.live > 0 && (
                  <span className="sidebar-league-live">{info.live}● live</span>
                )}
              </div>
              <button
                type="button"
                className={cn("sidebar-toggle", isOn && "sidebar-toggle--on")}
                onClick={() => toggleLeague(id)}
                aria-label={`Toggle ${name}`}
              >
                <span className="sidebar-toggle-knob" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Status filter */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Match Status</div>
        {STATUS_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={cn("sidebar-status-btn", statusFilter === key && "sidebar-status-btn--active")}
            onClick={() => setStatusFilter(key)}
          >
            <span>{label}</span>
            {key === "live" && liveTotal > 0 && (
              <span className="sidebar-status-badge">{liveTotal}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active filters summary */}
      {activeFilterCount > 0 && (
        <div className="sidebar-active-filters">
          <span className="sidebar-active-label">Active Filters</span>
          {enabledLeagues.size > 0 && (
            <div className="sidebar-active-chip">
              Leagues: {[...enabledLeagues].map((id) => LEAGUE_NAMES[id]).join(", ")}
            </div>
          )}
          {statusFilter !== "all" && (
            <div className="sidebar-active-chip">Status: {statusFilter}</div>
          )}
        </div>
      )}
    </aside>
  )
}
