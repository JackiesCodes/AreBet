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

export type GlobalStatusFilter = "all" | "live" | "upcoming"

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
}

const DEFAULT_PERSISTED: PersistedFilters = {
  disabledLeagues: [],
  pinnedLeagues: [],
  statusFilter: "all",
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface FilterCtx {
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

  // Pinned leagues
  pinnedLeagues: Set<string>
  togglePin: (key: string) => void
}

const Ctx = createContext<FilterCtx | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FilterProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const toast = useToast()

  // Read localStorage once at init
  const savedRef = useRef(readJSON<PersistedFilters>(STORAGE_KEYS.filters, DEFAULT_PERSISTED))

  // URL params take priority over localStorage on mount
  const initUrlLeagues = searchParams.get("leagues")
  const initUrlStatus  = searchParams.get("status")

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
    if (v && (["all", "live", "upcoming"] as string[]).includes(v))
      return v as GlobalStatusFilter
    return savedRef.current.statusFilter
  })

  // Track whether we're past the first render
  const isMounted = useRef(false)
  // Keep pathname in a ref so the URL sync effect doesn't run on navigation
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])
  // Stable refs for router and toast — prevents them re-triggering the sync effect
  const routerRef = useRef(router)
  useEffect(() => { routerRef.current = router }, [router])
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  // Persist filter state whenever any field changes
  useEffect(() => {
    writeJSON<PersistedFilters>(STORAGE_KEYS.filters, {
      disabledLeagues: Array.from(disabledLeagues),
      pinnedLeagues:   Array.from(pinnedLeagues),
      statusFilter,
    })
  }, [disabledLeagues, pinnedLeagues, statusFilter])

  // Sync filter changes → URL query params + toast (skip the initial mount)
  // router and toast are accessed via refs so they never re-trigger this effect
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (disabledLeagues.size > 0) params.set("leagues", Array.from(disabledLeagues).join(","))
    const qs = params.toString()
    routerRef.current.replace(`${pathnameRef.current}${qs ? `?${qs}` : ""}`, { scroll: false })
    toastRef.current.push("info", "Filters updated")
  }, [statusFilter, disabledLeagues])

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
    // Pinned leagues intentionally not reset — they are preferences, not filters
  }, [])

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const activeFilterCount = useMemo(
    () =>
      (disabledLeagues.size > 0 ? 1 : 0) +
      (statusFilter !== "all" ? 1 : 0),
    [disabledLeagues, statusFilter],
  )

  const applyToMatches = useCallback((matches: Match[]): Match[] => {
    // Always exclude finished matches from default feed
    let list = matches.filter((m) => m.status !== "FINISHED")

    if (disabledLeagues.size > 0) {
      list = list.filter((m) => !disabledLeagues.has(leagueKey(m)))
    }
    if (statusFilter !== "all") {
      const s = statusFilter.toUpperCase() as "LIVE" | "UPCOMING"
      list = list.filter((m) => m.status === s)
    }

    return list
  }, [disabledLeagues, statusFilter])

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
      pinnedLeagues,
      togglePin,
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
