"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Match } from "@/types/match"
import { readJSON, writeJSON, STORAGE_KEYS } from "@/lib/storage/stickiness"
import { useToast } from "@/components/primitives/Toast"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlobalStatusFilter = "all" | "live" | "upcoming" | "finished"
export type KickoffFilter = "all" | "next2h" | "today" | "tonight" | "tomorrow"

export const KICKOFF_LABELS: Record<KickoffFilter, string> = {
  all: "All times",
  next2h: "Next 2h",
  today: "Today",
  tonight: "Tonight",
  tomorrow: "Tomorrow",
}

/** Stable key for a league — uses leagueId to prevent cross-country collisions */
export function leagueKey(m: { leagueId?: number | null; league: string; country: string }): string {
  return m.leagueId != null ? String(m.leagueId) : `${m.league}::${m.country}`
}

// ---------------------------------------------------------------------------
// Persistence shape
// ---------------------------------------------------------------------------

interface PersistedFilters {
  disabledLeagues: string[]
  pinnedLeagues: string[]
  statusFilter: GlobalStatusFilter
  kickoffFilter: KickoffFilter
  valueOnly: boolean
  minConfidence: number
}

const DEFAULT_PERSISTED: PersistedFilters = {
  disabledLeagues: [],
  pinnedLeagues: [],
  statusFilter: "all",
  kickoffFilter: "all",
  valueOnly: false,
  minConfidence: 0,
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface FilterCtx {
  // Existing
  disabledLeagues: Set<string>
  statusFilter: GlobalStatusFilter
  toggleLeague: (key: string) => void
  isolateLeague: (key: string, allKeys: string[]) => void
  isolateLeagues: (keepKeys: string[], allKeys: string[]) => void
  clearDisabledLeagues: () => void
  setStatusFilter: (s: GlobalStatusFilter) => void
  resetFilters: () => void
  activeFilterCount: number
  applyToMatches: (matches: Match[]) => Match[]

  // Step 2 — kickoff time
  kickoffFilter: KickoffFilter
  setKickoffFilter: (f: KickoffFilter) => void

  // Step 3 — pinned leagues
  pinnedLeagues: Set<string>
  togglePin: (key: string) => void

  // Step 4 — value / confidence
  valueOnly: boolean
  setValueOnly: (v: boolean) => void
  minConfidence: number
  setMinConfidence: (n: number) => void
}

const Ctx = createContext<FilterCtx | null>(null)

// ---------------------------------------------------------------------------
// Kickoff filter helper (pure — no closure deps)
// ---------------------------------------------------------------------------

function matchesKickoffFilter(m: Match, filter: KickoffFilter): boolean {
  if (filter === "all" || m.status !== "UPCOMING") return true
  const now = new Date()
  const kickoff = new Date(m.kickoffISO)
  const ms = kickoff.getTime() - now.getTime()

  if (filter === "next2h") return ms > 0 && ms <= 7_200_000

  if (filter === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end   = new Date(now); end.setHours(23, 59, 59, 999)
    return kickoff >= start && kickoff <= end
  }

  if (filter === "tonight") {
    const start = new Date(now); start.setHours(18, 0, 0, 0)
    const end   = new Date(now); end.setHours(23, 59, 59, 999)
    return kickoff >= start && kickoff <= end
  }

  if (filter === "tomorrow") {
    const tomorrow = new Date(now.getTime() + 86_400_000)
    const start = new Date(tomorrow); start.setHours(0, 0, 0, 0)
    const end   = new Date(tomorrow); end.setHours(23, 59, 59, 999)
    return kickoff >= start && kickoff <= end
  }

  return true
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FilterProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const toast = useToast()

  // Read localStorage once at init — stored in a ref so all useState lazy
  // initialisers share the same parsed object without calling readJSON 6× times.
  const savedRef = useRef(readJSON<PersistedFilters>(STORAGE_KEYS.filters, DEFAULT_PERSISTED))

  // URL params take priority over localStorage on mount (read once via closure)
  const initUrlLeagues  = searchParams.get("leagues")
  const initUrlStatus   = searchParams.get("status")
  const initUrlKickoff  = searchParams.get("kickoff")
  const initUrlConf     = searchParams.get("confidence")
  const initUrlValue    = searchParams.get("value")

  const [disabledLeagues, setDisabledLeagues] = useState<Set<string>>(() => {
    if (initUrlLeagues !== null)
      return initUrlLeagues ? new Set(initUrlLeagues.split(",")) : new Set()
    return new Set(savedRef.current.disabledLeagues)
  })
  const [pinnedLeagues, setPinnedLeagues] = useState<Set<string>>(
    () => new Set(savedRef.current.pinnedLeagues),
  )
  const [statusFilter, setStatusFilter] = useState<GlobalStatusFilter>(() => {
    const v = initUrlStatus
    if (v && (["all", "live", "upcoming", "finished"] as string[]).includes(v))
      return v as GlobalStatusFilter
    return savedRef.current.statusFilter
  })
  const [kickoffFilter, setKickoffFilter] = useState<KickoffFilter>(() => {
    const v = initUrlKickoff
    if (v && (["all", "next2h", "today", "tonight", "tomorrow"] as string[]).includes(v))
      return v as KickoffFilter
    return savedRef.current.kickoffFilter
  })
  const [valueOnly, setValueOnly] = useState<boolean>(() => {
    if (initUrlValue !== null) return initUrlValue === "1"
    return savedRef.current.valueOnly
  })
  const [minConfidence, setMinConfidence] = useState<number>(() => {
    if (initUrlConf !== null) return Number(initUrlConf) || 0
    return savedRef.current.minConfidence
  })

  // Track whether we're past the first render so we don't push a URL on mount
  const isMounted = useRef(false)

  // Persist all filter state whenever any field changes
  useEffect(() => {
    writeJSON<PersistedFilters>(STORAGE_KEYS.filters, {
      disabledLeagues: Array.from(disabledLeagues),
      pinnedLeagues:   Array.from(pinnedLeagues),
      statusFilter,
      kickoffFilter,
      valueOnly,
      minConfidence,
    })
  }, [disabledLeagues, pinnedLeagues, statusFilter, kickoffFilter, valueOnly, minConfidence])

  // Sync filter changes → URL query params + toast (skip the initial mount)
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (kickoffFilter !== "all") params.set("kickoff", kickoffFilter)
    if (minConfidence > 0) params.set("confidence", String(minConfidence))
    if (valueOnly) params.set("value", "1")
    if (disabledLeagues.size > 0) params.set("leagues", Array.from(disabledLeagues).join(","))
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    toast.push("info", "Filters updated")
  }, [statusFilter, kickoffFilter, minConfidence, valueOnly, disabledLeagues, pathname, router, toast])

  // ---------------------------------------------------------------------------
  // League actions
  // ---------------------------------------------------------------------------

  const toggleLeague = useCallback((key: string) => {
    setDisabledLeagues((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const isolateLeague = useCallback((key: string, allKeys: string[]) => {
    const wouldDisable = allKeys.filter((k) => k !== key)
    const alreadyIsolated =
      disabledLeagues.size === wouldDisable.length &&
      wouldDisable.every((k) => disabledLeagues.has(k))
    setDisabledLeagues(alreadyIsolated ? new Set() : new Set(wouldDisable))
  }, [disabledLeagues])

  /** Disable all keys NOT in keepKeys — used by preset "Top Leagues". */
  const isolateLeagues = useCallback((keepKeys: string[], allKeys: string[]) => {
    setDisabledLeagues(new Set(allKeys.filter((k) => !keepKeys.includes(k))))
  }, [])

  const clearDisabledLeagues = useCallback(() => setDisabledLeagues(new Set()), [])

  // ---------------------------------------------------------------------------
  // Pin actions
  // ---------------------------------------------------------------------------

  const togglePin = useCallback((key: string) => {
    setPinnedLeagues((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Reset all
  // ---------------------------------------------------------------------------

  const resetFilters = useCallback(() => {
    setDisabledLeagues(new Set())
    setStatusFilter("all")
    setKickoffFilter("all")
    setValueOnly(false)
    setMinConfidence(0)
    // Pinned leagues intentionally not reset — they are preferences, not filters
  }, [])

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const activeFilterCount = useMemo(
    () =>
      (disabledLeagues.size > 0 ? 1 : 0) +
      (statusFilter !== "all" ? 1 : 0) +
      (kickoffFilter !== "all" ? 1 : 0) +
      (valueOnly ? 1 : 0) +
      (minConfidence > 0 ? 1 : 0),
    [disabledLeagues, statusFilter, kickoffFilter, valueOnly, minConfidence],
  )

  const applyToMatches = useCallback((matches: Match[]): Match[] => {
    let list = matches

    if (disabledLeagues.size > 0) {
      list = list.filter((m) => !disabledLeagues.has(leagueKey(m)))
    }
    if (statusFilter !== "all") {
      const s = statusFilter.toUpperCase() as "LIVE" | "UPCOMING" | "FINISHED"
      list = list.filter((m) => m.status === s)
    }
    if (kickoffFilter !== "all") {
      list = list.filter((m) => matchesKickoffFilter(m, kickoffFilter))
    }
    if (valueOnly) {
      list = list.filter((m) => m.prediction.valueEdge?.isValue === true)
    }
    if (minConfidence > 0) {
      list = list.filter((m) => (m.prediction.confidence ?? 0) >= minConfidence)
    }

    return list
  }, [disabledLeagues, statusFilter, kickoffFilter, valueOnly, minConfidence])

  return (
    <Ctx.Provider value={{
      disabledLeagues,
      statusFilter,
      toggleLeague,
      isolateLeague,
      isolateLeagues,
      clearDisabledLeagues,
      setStatusFilter,
      resetFilters,
      activeFilterCount,
      applyToMatches,
      kickoffFilter,
      setKickoffFilter,
      pinnedLeagues,
      togglePin,
      valueOnly,
      setValueOnly,
      minConfidence,
      setMinConfidence,
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
