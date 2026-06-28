"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useFilters, leagueKey } from "@/contexts/FilterContext"
import { useMatchFeedCtx } from "@/contexts/MatchFeedContext"
import { FilterPresetButtons } from "@/components/layout/FilterPresetButtons"
import { StatusFilter } from "./sidebar/StatusFilter"
import { LeagueTree } from "./sidebar/LeagueTree"
import type { GlobalStatusFilter } from "@/contexts/FilterContext"

/**
 * SidebarContent is shared between LeftSidebar (desktop) and MobileFilterSheet (bottom sheet).
 */
export function SidebarContent() {
  const { matches } = useMatchFeedCtx()
  const {
    disabledLeagues,
    statusFilter,
    toggleLeague,
    isolateLeague,
    clearDisabledLeagues,
    setStatusFilter,
    resetFilters,
    activeFilterCount,
    pinnedLeagues,
    togglePin,
  } = useFilters()

  const statusCounts = useMemo((): Record<GlobalStatusFilter, number> => ({
    all:      matches.filter((m) => m.status !== "FINISHED").length,
    live:     matches.filter((m) => m.status === "LIVE").length,
    upcoming: matches.filter((m) => m.status === "UPCOMING").length,
  }), [matches])

  const leagues = useMemo(() => {
    const map = new Map<string, { key: string; name: string; country: string; total: number; live: number }>()
    for (const m of matches) {
      if (m.status === "FINISHED") continue
      const key = leagueKey(m)
      const e = map.get(key) ?? { key, name: m.league, country: m.country, total: 0, live: 0 }
      e.total++
      if (m.status === "LIVE") e.live++
      map.set(key, e)
    }
    return Array.from(map.values()).sort((a, b) => b.live !== a.live ? b.live - a.live : b.total - a.total)
  }, [matches])

  return (
    <>
      {/* Sports categories */}
      <div className="sidebar-section sidebar-section--sports">
        <div className="sidebar-header">
          <span className="sidebar-header-title">Sports</span>
        </div>
        <div className="sidebar-sports-list">
          <button type="button" className="sidebar-sport-btn sidebar-sport-btn--active">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M5 12s2-4 7-4 7 4 7 4-2 4-7 4-7-4-7-4z" />
            </svg>
            Football
          </button>
          <button type="button" className="sidebar-sport-btn sidebar-sport-btn--disabled" disabled title="Coming soon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l14.14 14.14" />
            </svg>
            Basketball
            <span className="sidebar-sport-soon">Soon</span>
          </button>
          <button type="button" className="sidebar-sport-btn sidebar-sport-btn--disabled" disabled title="Coming soon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <ellipse cx="12" cy="12" rx="4" ry="10" />
              <path d="M2 12h20" />
            </svg>
            Tennis
            <span className="sidebar-sport-soon">Soon</span>
          </button>
          <button type="button" className="sidebar-sport-btn sidebar-sport-btn--disabled" disabled title="Coming soon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
            Cricket
            <span className="sidebar-sport-soon">Soon</span>
          </button>
        </div>
      </div>

      <div className="sidebar-section sidebar-section--presets">
        <FilterPresetButtons />
      </div>

      <div className="sidebar-header">
        <span className="sidebar-header-title">Filters</span>
        {activeFilterCount > 0 && (
          <button type="button" className="sidebar-clear-btn" onClick={resetFilters}>
            Clear {activeFilterCount > 1 ? `(${activeFilterCount})` : ""}
          </button>
        )}
      </div>

      <StatusFilter
        statusFilter={statusFilter}
        statusCounts={statusCounts}
        setStatusFilter={setStatusFilter}
      />

      <LeagueTree
        leagues={leagues}
        disabledLeagues={disabledLeagues}
        pinnedLeagues={pinnedLeagues}
        toggleLeague={toggleLeague}
        isolateLeague={isolateLeague}
        togglePin={togglePin}
        clearDisabledLeagues={clearDisabledLeagues}
      />

      {/* Quick links */}
      <div className="sidebar-section sidebar-section--quicklinks">
        <div className="sidebar-header">
          <span className="sidebar-header-title">Quick Links</span>
        </div>
        <nav className="sidebar-quicklinks" aria-label="Quick navigation">
          <Link href="/live-matches" className="sidebar-quicklink">
            <span className="sidebar-quicklink-dot sidebar-quicklink-dot--live" aria-hidden />
            In-Play
          </Link>
          <Link href="/upcoming-matches" className="sidebar-quicklink">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Today&apos;s Matches
          </Link>
          <Link href="/my-bets" className="sidebar-quicklink">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            My Bets
          </Link>
          <Link href="/promotions" className="sidebar-quicklink">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Promotions
          </Link>
        </nav>
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
