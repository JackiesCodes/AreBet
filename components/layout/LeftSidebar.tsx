"use client"

import { useMemo } from "react"
import { useFilters, leagueKey } from "@/contexts/FilterContext"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { FilterPresetButtons } from "@/components/layout/FilterPresetButtons"
import { StatusFilter } from "./sidebar/StatusFilter"
import { LeagueTree } from "./sidebar/LeagueTree"
import type { GlobalStatusFilter } from "@/contexts/FilterContext"

/**
 * SidebarContent is shared between LeftSidebar (desktop) and MobileFilterSheet (bottom sheet).
 */
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
