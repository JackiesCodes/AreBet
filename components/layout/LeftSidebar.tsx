"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils/cn"
import { useFilters, type GlobalStatusFilter } from "@/contexts/FilterContext"
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

  const [leagueSearch, setLeagueSearch] = useState("")

  const liveTotal = useMemo(() => matches.filter((m) => m.status === "LIVE").length, [matches])

  // Build league list dynamically from the feed — sorted: live first, then by count
  const leagues = useMemo(() => {
    const map = new Map<string, { total: number; live: number; country: string }>()
    for (const m of matches) {
      const e = map.get(m.league) ?? { total: 0, live: 0, country: m.country }
      e.total++
      if (m.status === "LIVE") e.live++
      map.set(m.league, e)
    }
    return Array.from(map.entries())
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => {
        if (b.live !== a.live) return b.live - a.live   // live first
        return b.total - a.total                         // then by count
      })
  }, [matches])

  const filteredLeagues = useMemo(() => {
    if (!leagueSearch.trim()) return leagues
    const q = leagueSearch.toLowerCase()
    return leagues.filter(
      (l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q),
    )
  }, [leagues, leagueSearch])

  return (
    <aside className="app-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-header-title">Filters</span>
        {activeFilterCount > 0 && (
          <button type="button" className="sidebar-clear-btn" onClick={resetFilters}>
            Clear {activeFilterCount > 1 ? `(${activeFilterCount})` : ""}
          </button>
        )}
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

      {/* League toggles — built dynamically from feed */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">
          Leagues &amp; Competitions
          {enabledLeagues.size > 0 && (
            <span className="sidebar-section-count"> ({enabledLeagues.size} selected)</span>
          )}
        </div>

        {/* Search box when there are many leagues */}
        {leagues.length > 8 && (
          <input
            type="search"
            className="sidebar-league-search"
            placeholder="Search leagues…"
            value={leagueSearch}
            onChange={(e) => setLeagueSearch(e.target.value)}
          />
        )}

        {filteredLeagues.length === 0 && (
          <p className="sidebar-empty">No leagues match "{leagueSearch}"</p>
        )}

        {filteredLeagues.map(({ name, total, live, country }) => {
          const isOn = enabledLeagues.size === 0 || enabledLeagues.has(name)
          return (
            <div key={name} className="sidebar-league-row">
              <div className="sidebar-league-info">
                <span className="sidebar-league-name">{name}</span>
                <span className="sidebar-league-country">{country}</span>
                {live > 0 && (
                  <span className="sidebar-league-live">{live}● live</span>
                )}
              </div>
              <div className="sidebar-league-right">
                <span className="sidebar-league-count">{total}</span>
                <button
                  type="button"
                  className={cn("sidebar-toggle", isOn && "sidebar-toggle--on")}
                  onClick={() => toggleLeague(name)}
                  aria-label={`Toggle ${name}`}
                >
                  <span className="sidebar-toggle-knob" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Active filters summary */}
      {activeFilterCount > 0 && (
        <div className="sidebar-active-filters">
          <span className="sidebar-active-label">Active Filters</span>
          {enabledLeagues.size > 0 && (
            <div className="sidebar-active-chip">
              {enabledLeagues.size === 1
                ? [...enabledLeagues][0]
                : `${enabledLeagues.size} leagues selected`}
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
