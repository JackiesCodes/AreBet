"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils/cn"
import {
  useFilters,
  leagueKey,
  type GlobalStatusFilter,
  type KickoffFilter,
  KICKOFF_LABELS,
} from "@/contexts/FilterContext"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { FilterPresetButtons } from "@/components/layout/FilterPresetButtons"

const STATUS_OPTIONS: { key: GlobalStatusFilter; label: string }[] = [
  { key: "all", label: "All Matches" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
]

const KICKOFF_OPTIONS: KickoffFilter[] = ["all", "next2h", "today", "tonight", "tomorrow"]
const CONFIDENCE_OPTIONS = [0, 50, 60, 70, 80]

interface LeagueInfo {
  key: string
  name: string
  country: string
  total: number
  live: number
  upcoming: number
  finished: number
}

interface LeagueRowProps {
  league: LeagueInfo
  isOn: boolean
  isIsolated: boolean
  isPinned: boolean
  onToggle: () => void
  onIsolate: () => void
  onPin: () => void
}

function LeagueRow({ league, isOn, isIsolated, isPinned, onToggle, onIsolate, onPin }: LeagueRowProps) {
  return (
    <div className={cn("sidebar-league-row", !isOn && "sidebar-league-row--disabled")}>
      <div className="sidebar-league-info">
        {league.live > 0 && <span className="sidebar-live-dot" aria-label="has live matches" />}
        <span className="sidebar-league-name">{league.name}</span>
      </div>
      <div className="sidebar-league-right">
        <span className="sidebar-league-count">{league.total}</span>
        <button
          type="button"
          className={cn("sidebar-pin-btn", isPinned && "sidebar-pin-btn--active")}
          onClick={onPin}
          title={isPinned ? "Unpin league" : "Pin league"}
          aria-label={isPinned ? `Unpin ${league.name}` : `Pin ${league.name}`}
        >
          📌
        </button>
        <button
          type="button"
          className={cn("sidebar-only-btn", isIsolated && "sidebar-only-btn--active")}
          onClick={onIsolate}
          title={isIsolated ? "Show all leagues" : "Show only this league"}
        >
          only
        </button>
        <button
          type="button"
          className={cn("sidebar-toggle", isOn && "sidebar-toggle--on")}
          onClick={onToggle}
          aria-label={`${isOn ? "Hide" : "Show"} ${league.name}`}
        >
          <span className="sidebar-toggle-knob" />
        </button>
      </div>
    </div>
  )
}

export function SidebarContent() {
  const { matches } = useMatchIntelligence()
  const {
    disabledLeagues,
    statusFilter,
    toggleLeague,
    isolateLeague,
    clearDisabledLeagues,
    setStatusFilter,
    resetFilters,
    activeFilterCount,
    kickoffFilter,
    setKickoffFilter,
    pinnedLeagues,
    togglePin,
    valueOnly,
    setValueOnly,
    minConfidence,
    setMinConfidence,
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

  const pinnedLeaguesList = useMemo(
    () => leagues.filter((l) => pinnedLeagues.has(l.key)),
    [leagues, pinnedLeagues],
  )

  const allCountryNames = useMemo(() => byCountry.map((g) => g.country), [byCountry])
  const allCollapsed = collapsedCountries.size === allCountryNames.length && allCountryNames.length > 0
  const toggleAllCountries = () =>
    setCollapsedCountries(allCollapsed ? new Set() : new Set(allCountryNames))

  return (
    <>
      {/* Quick presets */}
      <div className="sidebar-section sidebar-section--presets">
        <FilterPresetButtons />
      </div>

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

      {/* Kickoff time filter */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Kickoff Time</div>
        <div className="sidebar-kickoff-row">
          {KICKOFF_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={cn("sidebar-kickoff-btn", kickoffFilter === opt && "sidebar-kickoff-btn--active")}
              onClick={() => setKickoffFilter(opt)}
            >
              {KICKOFF_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Value / Confidence filter */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Predictions</div>
        <button
          type="button"
          className={cn("sidebar-status-btn", valueOnly && "sidebar-status-btn--active")}
          onClick={() => setValueOnly(!valueOnly)}
        >
          💰 Value bets only
        </button>
        <div className="sidebar-section-label sidebar-section-label--sub">Min confidence</div>
        <div className="sidebar-conf-row">
          {CONFIDENCE_OPTIONS.map((val) => (
            <button
              key={val}
              type="button"
              className={cn("sidebar-conf-btn", minConfidence === val && "sidebar-conf-btn--active")}
              onClick={() => setMinConfidence(val)}
            >
              {val === 0 ? "Off" : `${val}%`}
            </button>
          ))}
        </div>
      </div>

      {/* League toggles */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">
          Leagues &amp; Competitions
          {disabledLeagues.size > 0 && (
            <span className="sidebar-section-count"> ({disabledLeagues.size} hidden)</span>
          )}
          <button
            type="button"
            className="sidebar-collapse-all-btn"
            onClick={toggleAllCountries}
            title={allCollapsed ? "Expand all" : "Collapse all"}
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>

        {/* Pinned leagues */}
        {pinnedLeaguesList.length > 0 && (
          <div className="sidebar-pinned-group">
            <div className="sidebar-section-label sidebar-section-label--sub">📌 Pinned</div>
            {pinnedLeaguesList.map((league) => {
              const isOn = !disabledLeagues.has(league.key)
              const wouldDisable = allKeys.filter((k) => k !== league.key)
              const isIsolated =
                disabledLeagues.size === wouldDisable.length &&
                wouldDisable.every((k) => disabledLeagues.has(k))
              return (
                <LeagueRow
                  key={league.key}
                  league={league}
                  isOn={isOn}
                  isIsolated={isIsolated}
                  isPinned={true}
                  onToggle={() => toggleLeague(league.key)}
                  onIsolate={() => isolateLeague(league.key, allKeys)}
                  onPin={() => togglePin(league.key)}
                />
              )
            })}
          </div>
        )}

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

            {!collapsedCountries.has(country) && countryLeagues.map((league) => {
              const isOn = !disabledLeagues.has(league.key)
              const wouldDisable = allKeys.filter((k) => k !== league.key)
              const isIsolated =
                disabledLeagues.size === wouldDisable.length &&
                wouldDisable.every((k) => disabledLeagues.has(k))
              return (
                <LeagueRow
                  key={league.key}
                  league={league}
                  isOn={isOn}
                  isIsolated={isIsolated}
                  isPinned={pinnedLeagues.has(league.key)}
                  onToggle={() => toggleLeague(league.key)}
                  onIsolate={() => isolateLeague(league.key, allKeys)}
                  onPin={() => togglePin(league.key)}
                />
              )
            })}
          </div>
        ))}

        {disabledLeagues.size > 0 && (
          <button type="button" className="sidebar-clear-btn sidebar-clear-btn--leagues" onClick={clearDisabledLeagues}>
            Show all leagues
          </button>
        )}
      </div>
    </>
  )
}

export function LeftSidebar() {
  return (
    <aside className="app-sidebar">
      <SidebarContent />
    </aside>
  )
}
