"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils/cn"

interface LeagueInfo {
  key: string
  name: string
  country: string
  total: number
  live: number
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

interface LeagueTreeProps {
  leagues: LeagueInfo[]
  disabledLeagues: Set<string>
  pinnedLeagues: Set<string>
  toggleLeague: (key: string) => void
  isolateLeague: (key: string, allKeys: string[]) => void
  togglePin: (key: string) => void
  clearDisabledLeagues: () => void
}

export function LeagueTree({
  leagues,
  disabledLeagues,
  pinnedLeagues,
  toggleLeague,
  isolateLeague,
  togglePin,
  clearDisabledLeagues,
}: LeagueTreeProps) {
  const [leagueSearch, setLeagueSearch] = useState("")
  const [collapsedCountries, setCollapsedCountries] = useState<Set<string>>(new Set())

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

  const toggleCountry = (country: string) => {
    setCollapsedCountries((prev) => {
      const next = new Set(prev)
      if (next.has(country)) next.delete(country)
      else next.add(country)
      return next
    })
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-label">
        Leagues &amp; Competitions
        {disabledLeagues.size > 0 && (
          <span className="sidebar-section-count"> ({disabledLeagues.size} hidden)</span>
        )}
        <button
          type="button"
          className="sidebar-collapse-all-btn"
          onClick={() => setCollapsedCountries(allCollapsed ? new Set() : new Set(allCountryNames))}
          title={allCollapsed ? "Expand all" : "Collapse all"}
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      {pinnedLeaguesList.length > 0 && (
        <div className="sidebar-pinned-group">
          <div className="sidebar-section-label sidebar-section-label--sub">📌 Pinned</div>
          {pinnedLeaguesList.map((league) => {
            const isOn = !disabledLeagues.has(league.key)
            const wouldDisable = allKeys.filter((k) => k !== league.key)
            const isIsolated = disabledLeagues.size === wouldDisable.length && wouldDisable.every((k) => disabledLeagues.has(k))
            return (
              <LeagueRow
                key={league.key}
                league={league}
                isOn={isOn}
                isIsolated={isIsolated}
                isPinned
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
            const isIsolated = disabledLeagues.size === wouldDisable.length && wouldDisable.every((k) => disabledLeagues.has(k))
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
  )
}
