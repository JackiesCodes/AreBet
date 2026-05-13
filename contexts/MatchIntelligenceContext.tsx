"use client"

/**
 * MatchIntelligenceContext
 *
 * App-level context that owns the match feed and wires together:
 *  - useVisibilityPolling  (adaptive 10s/30s polling + page visibility)
 *  - useAlertState         (alert list, read/unread, alert prefs, notifications)
 *  - computeChanges        (change detection between feed snapshots)
 *  - Signal lifecycle      (record on UPCOMING, resolve on FINISHED)
 *
 * Both MainNav (bell badge) and HomeBoard (match cards) consume this.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Match, MatchFeed } from "@/types/match"
import type { MatchChange, AlertPreferences } from "@/types/alerts"
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling"
import { useAlertState } from "@/hooks/useAlertState"
import { computeChanges } from "@/hooks/useChangeDetection"
import { recordSignal, resolveSignal, signalIdForFixture } from "@/lib/services/signals"

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface MatchIntelligenceContextValue {
  matches: Match[]
  loading: boolean
  error: string | null
  fetchedAt: string | null
  refresh: () => void
  hasLive: boolean

  changes: MatchChange[]
  unreadCount: number
  latestChangeMap: Map<number, MatchChange>
  changedMatchIds: Set<number>

  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void

  alertPrefs: AlertPreferences
  setAlertPrefs: (prefs: AlertPreferences) => void

  watchedMatchIds: Set<string>
  setWatchedMatchIds: (ids: Set<string>) => void
}

const MatchIntelligenceContext = createContext<MatchIntelligenceContextValue | null>(null)

export function useMatchIntelligence(): MatchIntelligenceContextValue {
  const ctx = useContext(MatchIntelligenceContext)
  if (!ctx) throw new Error("useMatchIntelligence must be used inside MatchIntelligenceProvider")
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function MatchIntelligenceProvider({ children }: { children: ReactNode }) {
  // Feed state
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  // Refs for use inside polling callbacks (avoid stale closures)
  const prevMatchesRef = useRef<Match[]>([])
  const inFlightRef = useRef(false)
  const recordedSignalIdsRef = useRef<Set<string>>(new Set())
  const [watchedMatchIds, setWatchedMatchIds] = useState<Set<string>>(new Set())
  const watchedMatchIdsRef = useRef<Set<string>>(new Set())

  const stableSetWatchedMatchIds = useCallback((ids: Set<string>) => {
    watchedMatchIdsRef.current = ids
    setWatchedMatchIds(ids)
  }, [])

  // Alert state (changes, read/unread, prefs, browser notifications)
  const {
    changes, appendChanges,
    unreadCount, latestChangeMap, changedMatchIds,
    markRead, markAllRead, clearAll,
    alertPrefs, alertPrefsRef, setAlertPrefs,
  } = useAlertState()

  // Stable ref so tick() can read latest hasLive without being recreated
  const matchesRef = useRef<Match[]>([])

  // ---------------------------------------------------------------------------
  // Polling tick
  // ---------------------------------------------------------------------------
  const tick = useCallback(async (signal: AbortSignal) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const res = await fetch("/api/matches", { cache: "no-store", signal })
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`)
      const feed = (await res.json()) as MatchFeed
      const nextMatches = feed.matches ?? []

      // Change detection
      const newChanges = computeChanges(
        prevMatchesRef.current,
        nextMatches,
        watchedMatchIdsRef.current,
        alertPrefsRef.current,
      )
      appendChanges(newChanges)

      // Resolve signals for matches that just finished
      for (const change of newChanges) {
        if (change.type !== "match_finished") continue
        const finished = nextMatches.find((m) => m.id === change.matchId)
        if (!finished) continue
        const sigId = signalIdForFixture(finished.id, finished.kickoffISO)
        void resolveSignal(sigId, finished.score.home, finished.score.away)
      }

      // Record signals for UPCOMING matches (idempotent, once per session)
      for (const match of nextMatches) {
        if (match.status !== "UPCOMING") continue
        const sigId = signalIdForFixture(match.id, match.kickoffISO)
        if (recordedSignalIdsRef.current.has(sigId)) continue
        recordedSignalIdsRef.current.add(sigId)
        void recordSignal(match)
      }

      prevMatchesRef.current = nextMatches
      matchesRef.current = nextMatches
      setMatches(nextMatches)
      setFetchedAt(feed.fetchedAt ?? null)
      setError(null)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [appendChanges, alertPrefsRef])

  const getHasLive = useCallback(
    () => matchesRef.current.some((m) => m.status === "LIVE"),
    [],
  )

  // Wire up visibility-aware adaptive polling
  useVisibilityPolling(tick, getHasLive)

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const hasLive = useMemo(() => matches.some((m) => m.status === "LIVE"), [matches])

  const value: MatchIntelligenceContextValue = {
    matches,
    loading,
    error,
    fetchedAt,
    refresh: () => void tick(new AbortController().signal),
    hasLive,
    changes,
    unreadCount,
    latestChangeMap,
    changedMatchIds,
    markRead,
    markAllRead,
    clearAll,
    alertPrefs,
    setAlertPrefs,
    watchedMatchIds,
    setWatchedMatchIds: stableSetWatchedMatchIds,
  }

  return (
    <MatchIntelligenceContext.Provider value={value}>
      {children}
    </MatchIntelligenceContext.Provider>
  )
}
