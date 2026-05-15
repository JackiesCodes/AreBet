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
  allKeys: string[]
  onToggle: () => void
  onIsolate: () => void
  onPin: () => void
}

function LeagueRow({ league, isOn, isIsolated, isPinned, onToggle, onIsolate, onPin }: LeagueRowProps) {
  return (
    <div className={cn("league-row", !isOn && "league-row--hidden")}>
      <div className="league-row-left">
        {league.live > 0 && (
          <span className="league-live-dot" aria-label={`${league.live} live`} />
        )}
        <span className="league-row-name">{league.name}</span>
        {league.live > 0 && (
          <span className="league-match-count league-match-count--live">{league.live}</span>
        )}
      </div>
      <div className="league-row-actions">
        <button
          type="button"
          className={cn("league-only-btn", isIsolated && "league-only-btn--active")}
          onClick={onIsolate}
          title={isIsolated ? "Show all leagues" : "Show only this league"}
        >
          only
        </button>
        <button
          type="button"
          className={cn("league-pin-btn", isPinned && "league-pin-btn--active")}
          onClick={onPin}
          aria-label={isPinned ? `Remove ${league.name} from Top Leagues` : `Add ${league.name} to Top Leagues`}
          title={isPinned ? "Remove from Top Leagues" : "Add to Top Leagues"}
        >
          ★
        </button>
        <button
          type="button"
          className={cn("league-toggle", isOn && "league-toggle--on")}
          onClick={onToggle}
          aria-label={`${isOn ? "Hide" : "Show"} ${league.name}`}
        >
          <span className="league-toggle-knob" />
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
  const [allCompOpen, setAllCompOpen] = useState(false)

  const allKeys = useMemo(() => leagues.map((l) => l.key), [leagues])

  const topLeagues = useMemo(
    () => leagues.filter((l) => pinnedLeagues.has(l.key)),
    [leagues, pinnedLeagues],
  )

  const otherLeagues = useMemo(
    () => leagues.filter((l) => !pinnedLeagues.has(l.key)),
    [leagues, pinnedLeagues],
  )

  const filteredOther = useMemo(() => {
    if (!leagueSearch.trim()) return otherLeagues
    const q = leagueSearch.toLowerCase()
    return otherLeagues.filter(
      (l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q),
    )
  }, [otherLeagues, leagueSearch])

  function renderRow(league: LeagueInfo) {
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
        allKeys={allKeys}
        onToggle={() => toggleLeague(league.key)}
        onIsolate={() => isolateLeague(league.key, allKeys)}
        onPin={() => togglePin(league.key)}
      />
    )
  }

  return (
    <div className="sidebar-section league-tree">
      {/* Top Leagues group */}
      <div className="league-tree-group">
        <div className="league-tree-group-header">
          <span className="league-tree-group-title">Top Leagues</span>
          <span className="league-tree-group-hint">★ to pin</span>
        </div>
        {topLeagues.length === 0 ? (
          <p className="league-tree-empty">Pin a league using ★ to add it here.</p>
        ) : (
          topLeagues.map(renderRow)
        )}
      </div>

      {/* All Competitions group */}
      <div className="league-tree-group">
        <button
          type="button"
          className="league-tree-group-header league-tree-group-header--toggle"
          onClick={() => setAllCompOpen((v) => !v)}
          aria-expanded={allCompOpen}
        >
          <span className="league-tree-group-title">All Competitions</span>
          <span className="league-tree-chevron" aria-hidden>{allCompOpen ? "▴" : "▾"}</span>
          {!allCompOpen && otherLeagues.filter((l) => l.live > 0).length > 0 && (
            <span className="league-live-summary">
              {otherLeagues.filter((l) => l.live > 0).length} live
            </span>
          )}
        </button>

        {allCompOpen && (
          <>
            {leagues.length > 6 && (
              <input
                type="search"
                className="sidebar-league-search"
                placeholder="Search competitions…"
                value={leagueSearch}
                onChange={(e) => setLeagueSearch(e.target.value)}
              />
            )}
            {filteredOther.length === 0 ? (
              <p className="league-tree-empty">No competitions match &ldquo;{leagueSearch}&rdquo;</p>
            ) : (
              filteredOther.map(renderRow)
            )}
          </>
        )}
      </div>

      {disabledLeagues.size > 0 && (
        <button type="button" className="sidebar-clear-btn sidebar-clear-btn--leagues" onClick={clearDisabledLeagues}>
          Show all leagues
        </button>
      )}
    </div>
  )
}
