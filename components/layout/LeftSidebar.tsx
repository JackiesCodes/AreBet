"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils/cn"
import { useFilters, leagueKey, type GlobalStatusFilter } from "@/contexts/FilterContext"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"

const STATUS_OPTIONS: { key: GlobalStatusFilter; label: string }[] = [
  { key: "all", label: "All Matches" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
]

interface LeagueInfo {
  key: string
  name: string
  country: string
  total: number
  live: number
  upcoming: number
  finished: number
}

export function LeftSidebar() {
  const { matches } = useMatchIntelligence()
  const {
    disabledLeagues,
    statusFilter,
    toggleLeague,
    isolateLeague,
    setStatusFilter,
    resetFilters,
    activeFilterCount,
  } = useFilters()

  const [leagueSearch, setLeagueSearch] = useState("")
  const [collapsedCountries, setCollapsedCountries] = useState<Set<string>>(new Set())

  const toggleCountry = (country: string) => {
    setCollapsedCountries((prev) => {
      const next = new Set(prev)
      if (next.has(country)) next.delete(country)
      else next.add(country)
      return next
    })
  }

  const statusCounts = useMemo(() => ({
    all: matches.length,
    live: matches.filter((m) => m.status === "LIVE").length,
    upcoming: matches.filter((m) => m.status === "UPCOMING").length,
    finished: matches.filter((m) => m.status === "FINISHED").length,
  }), [matches])

  // Build league list keyed by leagueId to prevent cross-country collisions
  const leagues = useMemo(() => {
    const map = new Map<string, LeagueInfo>()
    for (const m of matches) {
      const key = leagueKey(m)
      const e = map.get(key) ?? { key, name: m.league, country: m.country, total: 0, live: 0, upcoming: 0, finished: 0 }
      e.total++
      if (m.status === "LIVE") e.live++
      else if (m.status === "UPCOMING") e.upcoming++
      else if (m.status === "FINISHED") e.finished++
      map.set(key, e)
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.live !== a.live) return b.live - a.live
      return b.total - a.total
    })
  }, [matches])

  const allKeys = useMemo(() => leagues.map((l) => l.key), [leagues])

  // Group leagues by country, sorted: most live first
  const byCountry = useMemo(() => {
    const map = new Map<string, LeagueInfo[]>()
    for (const l of leagues) {
      const arr = map.get(l.country) ?? []
      arr.push(l)
      map.set(l.country, arr)
    }
    return Array.from(map.entries())
      .map(([country, ls]) => ({
        country,
        leagues: ls,
        live: ls.reduce((s, l) => s + l.live, 0),
        total: ls.reduce((s, l) => s + l.total, 0),
      }))
      .sort((a, b) => b.live !== a.live ? b.live - a.live : b.total - a.total)
  }, [leagues])

  const filteredGroups = useMemo(() => {
    if (!leagueSearch.trim()) return byCountry
    const q = leagueSearch.toLowerCase()
    return byCountry
      .map((g) => ({
        ...g,
        leagues: g.leagues.filter(
          (l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.leagues.length > 0)
  }, [byCountry, leagueSearch])

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
        {STATUS_OPTIONS.map(({ key, label }) => {
          const count = statusCounts[key]
          return (
            <button
              key={key}
              type="button"
              className={cn("sidebar-status-btn", statusFilter === key && "sidebar-status-btn--active")}
              onClick={() => setStatusFilter(key)}
            >
              <span>{label}</span>
              {key !== "all" && count > 0 && (
                <span className={cn(
                  "sidebar-status-badge",
                  key === "live" && "sidebar-status-badge--live",
                  key === "upcoming" && "sidebar-status-badge--upcoming",
                  key === "finished" && "sidebar-status-badge--finished",
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* League toggles — grouped by country */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">
          Leagues &amp; Competitions
          {disabledLeagues.size > 0 && (
            <span className="sidebar-section-count"> ({disabledLeagues.size} hidden)</span>
          )}
        </div>

        {leagues.length > 8 && (
          <input
            type="search"
            className="sidebar-league-search"
            placeholder="Search leagues…"
            value={leagueSearch}
            onChange={(e) => setLeagueSearch(e.target.value)}
          />
        )}

        {filteredGroups.length === 0 && (
          <p className="sidebar-empty">No leagues match &ldquo;{leagueSearch}&rdquo;</p>
        )}

        {filteredGroups.map(({ country, leagues: countryLeagues, live: countryLive }) => (
          <div key={country} className="sidebar-country-group">
            {/* Country heading — click to collapse */}
            <button
              type="button"
              className="sidebar-country-heading"
              onClick={() => toggleCountry(country)}
              aria-expanded={!collapsedCountries.has(country)}
            >
              <span className={cn("sidebar-country-chevron", collapsedCountries.has(country) && "sidebar-country-chevron--collapsed")}>
                ▾
              </span>
              <span className="sidebar-country-name">{country}</span>
              {countryLive > 0 && (
                <span className="sidebar-league-live">{countryLive}● live</span>
              )}
            </button>

            {/* League rows */}
            {!collapsedCountries.has(country) && countryLeagues.map((league) => {
              const isOn = !disabledLeagues.has(league.key)
              const wouldDisable = allKeys.filter((k) => k !== league.key)
              const isIsolated =
                disabledLeagues.size === wouldDisable.length &&
                wouldDisable.every((k) => disabledLeagues.has(k))
              return (
                <div key={league.key} className={cn("sidebar-league-row", !isOn && "sidebar-league-row--disabled")}>
                  <div className="sidebar-league-info">
                    {league.live > 0 && <span className="sidebar-live-dot" aria-label="has live matches" />}
                    <span className="sidebar-league-name">{league.name}</span>
                  </div>
                  <div className="sidebar-league-right">
                    <span className="sidebar-league-count">{league.total}</span>
                    <button
                      type="button"
                      className={cn("sidebar-only-btn", isIsolated && "sidebar-only-btn--active")}
                      onClick={() => isolateLeague(league.key, allKeys)}
                      title={isIsolated ? "Show all leagues" : "Show only this league"}
                    >
                      only
                    </button>
                    <button
                      type="button"
                      className={cn("sidebar-toggle", isOn && "sidebar-toggle--on")}
                      onClick={() => toggleLeague(league.key)}
                      aria-label={`${isOn ? "Hide" : "Show"} ${league.name}`}
                    >
                      <span className="sidebar-toggle-knob" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Active filters summary */}
      {activeFilterCount > 0 && (
        <div className="sidebar-active-filters">
          <span className="sidebar-active-label">Active Filters</span>
          {disabledLeagues.size > 0 && (
            <div className="sidebar-active-chip">
              {disabledLeagues.size === 1 ? "1 league hidden" : `${disabledLeagues.size} leagues hidden`}
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
