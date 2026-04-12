"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import type { Match } from "@/types/match"

export const LEAGUE_IDS = [39, 140, 135, 78, 61]
export const LEAGUE_NAMES: Record<number, string> = {
  39: "Premier League",
  140: "La Liga",
  135: "Serie A",
  78: "Bundesliga",
  61: "Ligue 1",
}

export type GlobalStatusFilter = "all" | "live" | "upcoming" | "finished"

interface FilterCtx {
  enabledLeagues: Set<number>   // empty = all leagues shown
  statusFilter: GlobalStatusFilter
  toggleLeague: (id: number) => void
  setStatusFilter: (s: GlobalStatusFilter) => void
  resetFilters: () => void
  activeFilterCount: number
  applyToMatches: (matches: Match[]) => Match[]
}

const Ctx = createContext<FilterCtx | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [enabledLeagues, setEnabledLeagues] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<GlobalStatusFilter>("all")

  const toggleLeague = (id: number) => {
    setEnabledLeagues((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      // If all toggled on, reset to "all" (empty set)
      return next.size === LEAGUE_IDS.length ? new Set() : next
    })
  }

  const resetFilters = () => {
    setEnabledLeagues(new Set())
    setStatusFilter("all")
  }

  const activeFilterCount = useMemo(
    () => (enabledLeagues.size > 0 ? 1 : 0) + (statusFilter !== "all" ? 1 : 0),
    [enabledLeagues, statusFilter],
  )

  const applyToMatches = (matches: Match[]): Match[] => {
    let list = matches
    if (enabledLeagues.size > 0) {
      const names = new Set([...enabledLeagues].map((id) => LEAGUE_NAMES[id]).filter(Boolean))
      list = list.filter((m) => names.has(m.league))
    }
    if (statusFilter !== "all") {
      const s = statusFilter.toUpperCase() as "LIVE" | "UPCOMING" | "FINISHED"
      list = list.filter((m) => m.status === s)
    }
    return list
  }

  return (
    <Ctx.Provider value={{
      enabledLeagues,
      statusFilter,
      toggleLeague,
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
