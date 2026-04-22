"use client"

/**
 * MatchIntelligenceContext
 *
 * App-level context that owns:
 *  - the match feed (30s polling)
 *  - change detection between polls
 *  - unread alert state
 *  - alert preferences
 *
 * Both MainNav (bell badge) and HomeBoard (match cards) consume this.
 * This avoids running two independent feed pollers in the same session.
 */

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
import type { Match, MatchFeed } from "@/types/match"
import type { MatchChange, AlertPreferences } from "@/types/alerts"
import { DEFAULT_ALERT_PREFS } from "@/types/alerts"
import { detectChanges, latestChangePerMatch } from "@/lib/utils/match-changes"
import { readJSON, writeJSON } from "@/lib/storage/stickiness"
import { recordSignal, resolveSignal, signalIdForFixture } from "@/lib/services/signals"

const PREFS_KEY = "arebet:alert-prefs:v1"
const POLL_MS_IDLE = 30_000
const POLL_MS_LIVE = 10_000   // 10s when live — edge cache refreshes at 15s
const MAX_CHANGES = 60

// Change types that warrant a browser notification (critical + high only)
const NOTIF_TYPES = new Set(["went_live", "goal", "red_card", "value_appeared"] as const)

function shouldNotify(change: MatchChange, prefs: AlertPreferences): boolean {
  if (!NOTIF_TYPES.has(change.type as typeof NOTIF_TYPES extends Set<infer T> ? T : never)) return false
  if (change.type === "goal"            && !prefs.goals)          return false
  if (change.type === "red_card"        && !prefs.redCards)       return false
  if (change.type === "value_appeared"  && !prefs.valueAppeared)  return false
  if (change.type === "went_live"       && !prefs.wentLive)       return false
  return true
}

function fireNotification(change: MatchChange): void {
  if (typeof Notification === "undefined") return
  if (Notification.permission !== "granted") return
  try {
    new Notification(change.summary, {
      body: [change.matchLabel, change.detail].filter(Boolean).join(" · "),
      tag:  change.id,       // prevents duplicate browser notifications for same id
      icon: "/arebet-logo.svg",
      silent: false,
    })
  } catch {
    /* some browsers block in certain contexts — swallow silently */
  }
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface MatchIntelligenceContextValue {
  /** Current match feed */
  matches: Match[]
  loading: boolean
  error: string | null
  fetchedAt: string | null
  refresh: () => void
  /** True when at least one match is currently live */
  hasLive: boolean

  /** All detected changes this session (newest first) */
  changes: MatchChange[]
  /** Unread count — drives alert bell badge */
  unreadCount: number
  /** Latest unread change per match (for card indicators) */
  latestChangeMap: Map<number, MatchChange>
  /** IDs of matches with any unread changes */
  changedMatchIds: Set<number>

  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void

  alertPrefs: AlertPreferences
  setAlertPrefs: (prefs: AlertPreferences) => void

  /** Set of match entity IDs being watched (from favorites) */
  watchedMatchIds: Set<string>
  setWatchedMatchIds: (ids: Set<string>) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

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

  // Change tracking
  const [changes, setChanges] = useState<MatchChange[]>([])
  const prevMatchesRef = useRef<Match[]>([])
  const inFlightRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aliveRef = useRef(true)
  // Tracks change IDs that have already fired a browser notification this session
  const notifiedIdsRef = useRef<Set<string>>(new Set())

  // Tracks signal IDs already submitted this session — avoids redundant API calls
  const recordedSignalIdsRef = useRef<Set<string>>(new Set())

  // Watchlist (fed from useFavorites in HomeBoard)
  const [watchedMatchIds, setWatchedMatchIds] = useState<Set<string>>(new Set())

  // Alert prefs — load from localStorage, persist on change
  const [alertPrefs, setAlertPrefsState] = useState<AlertPreferences>(() => ({
    ...DEFAULT_ALERT_PREFS,
    ...readJSON<Partial<AlertPreferences>>(PREFS_KEY, {}),
  }))

  const setAlertPrefs = useCallback((prefs: AlertPreferences) => {
    setAlertPrefsState(prefs)
    writeJSON(PREFS_KEY, prefs)
  }, [])

  // ---------------------------------------------------------------------------
  // Browser notifications — fire once per high-priority change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    for (const change of changes) {
      if (change.read) continue
      if (notifiedIdsRef.current.has(change.id)) continue
      if (!shouldNotify(change, alertPrefs)) continue
      notifiedIdsRef.current.add(change.id)
      fireNotification(change)
    }
  }, [changes, alertPrefs])

  // ---------------------------------------------------------------------------
  // Feed polling
  // ---------------------------------------------------------------------------
  const tick = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const res = await fetch("/api/matches", { cache: "no-store" })
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`)
      const feed = (await res.json()) as MatchFeed

      if (!aliveRef.current) return

      const nextMatches = feed.matches ?? []

      // Change detection — only if we have a previous snapshot
      if (prevMatchesRef.current.length > 0 && nextMatches.length > 0) {
        const newChanges = detectChanges(
          prevMatchesRef.current,
          nextMatches,
          watchedMatchIds,
          alertPrefs,
        )
        if (newChanges.length > 0) {
          setChanges((prev) => [...newChanges, ...prev].slice(0, MAX_CHANGES))

          // Resolve signals for any matches that just finished
          for (const change of newChanges) {
            if (change.type !== "match_finished") continue
            const finished = nextMatches.find((m) => m.id === change.matchId)
            if (!finished) continue
            const sigId = signalIdForFixture(finished.id, finished.kickoffISO)
            void resolveSignal(sigId, finished.score.home, finished.score.away)
          }
        }
      }

      // Record signals for UPCOMING matches with real prediction data.
      // One call per signal_id per session — route handler deduplicates at DB level.
      for (const match of nextMatches) {
        if (match.status !== "UPCOMING") continue
        const sigId = signalIdForFixture(match.id, match.kickoffISO)
        if (recordedSignalIdsRef.current.has(sigId)) continue
        recordedSignalIdsRef.current.add(sigId)
        void recordSignal(match) // fire-and-forget
      }

      prevMatchesRef.current = nextMatches
      setMatches(nextMatches)
      setFetchedAt(feed.fetchedAt ?? null)
      setError(null)
    } catch (err) {
      if (!aliveRef.current) return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      inFlightRef.current = false
      if (aliveRef.current) setLoading(false)
    }
  }, [watchedMatchIds, alertPrefs])

  // Schedule next tick — adaptive: 15s when live matches exist, 30s otherwise
  const schedule = useCallback((currentMatches: Match[]) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const hasLive = currentMatches.some((m) => m.status === "LIVE")
    const delay = hasLive ? POLL_MS_LIVE : POLL_MS_IDLE
    timerRef.current = setTimeout(async () => {
      if (typeof document !== "undefined" && document.hidden) {
        schedule(currentMatches)
        return
      }
      await tick()
      // Re-read prevMatchesRef after tick completes for accurate live detection
      schedule(prevMatchesRef.current)
    }, delay)
  }, [tick])

  useEffect(() => {
    aliveRef.current = true
    void tick()
    schedule(prevMatchesRef.current)
    const onVis = () => { if (!document.hidden) void tick() }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      aliveRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [tick, schedule])

  // ---------------------------------------------------------------------------
  // Alert state helpers
  // ---------------------------------------------------------------------------
  const markRead = useCallback((id: string) => {
    setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, read: true } : c)))
  }, [])

  const markAllRead = useCallback(() => {
    setChanges((prev) => prev.map((c) => ({ ...c, read: true })))
  }, [])

  const clearAll = useCallback(() => setChanges([]), [])

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const unreadChanges = useMemo(() => changes.filter((c) => !c.read), [changes])
  const unreadCount = unreadChanges.length

  const latestChangeMap = useMemo(() => latestChangePerMatch(unreadChanges), [unreadChanges])

  const changedMatchIds = useMemo(
    () => new Set(unreadChanges.map((c) => c.matchId)),
    [unreadChanges],
  )

  const hasLive = useMemo(() => matches.some((m) => m.status === "LIVE"), [matches])

  const value: MatchIntelligenceContextValue = {
    matches,
    loading,
    error,
    fetchedAt,
    refresh: () => void tick(),
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
    setWatchedMatchIds,
  }

  return (
    <MatchIntelligenceContext.Provider value={value}>
      {children}
    </MatchIntelligenceContext.Provider>
  )
}
