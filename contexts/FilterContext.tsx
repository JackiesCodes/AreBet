"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import type { Match } from "@/types/match"

export type GlobalStatusFilter = "all" | "live" | "upcoming" | "finished"

/** Stable key for a league — uses leagueId to prevent cross-country collisions */
export function leagueKey(m: { leagueId?: number | null; league: string; country: string }): string {
  return m.leagueId != null ? String(m.leagueId) : `${m.league}::${m.country}`
}

interface FilterCtx {
  disabledLeagues: Set<string>  // keys of hidden leagues; empty = all visible
  statusFilter: GlobalStatusFilter
  toggleLeague: (key: string) => void
  isolateLeague: (key: string, allKeys: string[]) => void
  setStatusFilter: (s: GlobalStatusFilter) => void
  resetFilters: () => void
  activeFilterCount: number
  applyToMatches: (matches: Match[]) => Match[]
}

const Ctx = createContext<FilterCtx | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [disabledLeagues, setDisabledLeagues] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<GlobalStatusFilter>("all")

  const toggleLeague = (key: string) => {
    setDisabledLeagues((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isolateLeague = (key: string, allKeys: string[]) => {
    // If already isolated to this league, reset to show all
    const wouldDisable = allKeys.filter((k) => k !== key)
    const alreadyIsolated =
      disabledLeagues.size === wouldDisable.length &&
      wouldDisable.every((k) => disabledLeagues.has(k))
    if (alreadyIsolated) {
      setDisabledLeagues(new Set())
    } else {
      setDisabledLeagues(new Set(wouldDisable))
    }
  }

  const resetFilters = () => {
    setDisabledLeagues(new Set())
    setStatusFilter("all")
  }

  const activeFilterCount = useMemo(
    () => (disabledLeagues.size > 0 ? 1 : 0) + (statusFilter !== "all" ? 1 : 0),
    [disabledLeagues, statusFilter],
  )

  const applyToMatches = (matches: Match[]): Match[] => {
    let list = matches
    if (disabledLeagues.size > 0) {
      list = list.filter((m) => !disabledLeagues.has(leagueKey(m)))
    }
    if (statusFilter !== "all") {
      const s = statusFilter.toUpperCase() as "LIVE" | "UPCOMING" | "FINISHED"
      list = list.filter((m) => m.status === s)
    }
    return list
  }

  return (
    <Ctx.Provider value={{
      disabledLeagues,
      statusFilter,
      toggleLeague,
      isolateLeague,
      setStatusFilter,
      resetFilters,
      activeFilterCount,
      applyToMatches,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useFilters(): FilterCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useFilters must be inside FilterProvider")
  return ctx
}
