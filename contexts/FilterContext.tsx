"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import type { Match } from "@/types/match"

export type GlobalStatusFilter = "all" | "live" | "upcoming" | "finished"

interface FilterCtx {
  enabledLeagues: Set<string>    // empty = all leagues shown; non-empty = only these leagues
  statusFilter: GlobalStatusFilter
  toggleLeague: (name: string) => void
  setStatusFilter: (s: GlobalStatusFilter) => void
  resetFilters: () => void
  activeFilterCount: number
  applyToMatches: (matches: Match[]) => Match[]
}

const Ctx = createContext<FilterCtx | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [enabledLeagues, setEnabledLeagues] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<GlobalStatusFilter>("all")

  const toggleLeague = (name: string) => {
    setEnabledLeagues((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
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
      list = list.filter((m) => enabledLeagues.has(m.league))
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
