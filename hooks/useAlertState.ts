"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MatchChange, AlertPreferences } from "@/types/alerts"
import { DEFAULT_ALERT_PREFS } from "@/types/alerts"
import { latestChangePerMatch } from "@/lib/utils/match-changes"
import { readJSON, writeJSON } from "@/lib/storage/stickiness"

const PREFS_KEY = "arebet:alert-prefs:v1"
const MAX_CHANGES = 60

// Change types that warrant a browser notification
const NOTIF_TYPES = new Set(["went_live", "goal", "red_card", "value_appeared"] as const)
type NotifType = typeof NOTIF_TYPES extends Set<infer T> ? T : never

function shouldNotify(change: MatchChange, prefs: AlertPreferences): boolean {
  if (!NOTIF_TYPES.has(change.type as NotifType)) return false
  if (change.type === "goal"           && !prefs.goals)         return false
  if (change.type === "red_card"       && !prefs.redCards)      return false
  if (change.type === "value_appeared" && !prefs.valueAppeared) return false
  if (change.type === "went_live"      && !prefs.wentLive)      return false
  return true
}

function fireNotification(change: MatchChange): void {
  if (typeof Notification === "undefined") return
  if (Notification.permission !== "granted") return
  try {
    new Notification(change.summary, {
      body: [change.matchLabel, change.detail].filter(Boolean).join(" · "),
      tag:  change.id,
      icon: "/arebet-logo.svg",
      silent: false,
    })
  } catch {
    /* some browsers block in certain contexts — swallow silently */
  }
}

export interface AlertStateReturn {
  changes: MatchChange[]
  /** Append new changes to the list (called by the polling tick) */
  appendChanges: (newChanges: MatchChange[]) => void
  unreadCount: number
  latestChangeMap: Map<number, MatchChange>
  changedMatchIds: Set<number>
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
  alertPrefs: AlertPreferences
  /** Ref mirror — read inside polling tick without stale closure issues */
  alertPrefsRef: React.MutableRefObject<AlertPreferences>
  setAlertPrefs: (prefs: AlertPreferences) => void
}

/**
 * Manages the in-app alert list, read/unread state, alert preferences,
 * and browser notification dispatch.
 */
export function useAlertState(): AlertStateReturn {
  const [changes, setChanges] = useState<MatchChange[]>([])
  const notifiedIdsRef = useRef<Set<string>>(new Set())

  const [alertPrefs, setAlertPrefsState] = useState<AlertPreferences>(() => ({
    ...DEFAULT_ALERT_PREFS,
    ...readJSON<Partial<AlertPreferences>>(PREFS_KEY, {}),
  }))
  const alertPrefsRef = useRef<AlertPreferences>({
    ...DEFAULT_ALERT_PREFS,
    ...readJSON<Partial<AlertPreferences>>(PREFS_KEY, {}),
  })

  const setAlertPrefs = useCallback((prefs: AlertPreferences) => {
    alertPrefsRef.current = prefs
    setAlertPrefsState(prefs)
    writeJSON(PREFS_KEY, prefs)
  }, [])

  // Fire browser notifications for unread high-priority changes
  useEffect(() => {
    for (const change of changes) {
      if (change.read) continue
      if (notifiedIdsRef.current.has(change.id)) continue
      if (!shouldNotify(change, alertPrefs)) continue
      notifiedIdsRef.current.add(change.id)
      fireNotification(change)
    }
  }, [changes, alertPrefs])

  const appendChanges = useCallback((newChanges: MatchChange[]) => {
    if (newChanges.length === 0) return
    setChanges((prev) => [...newChanges, ...prev].slice(0, MAX_CHANGES))
  }, [])

  const markRead = useCallback((id: string) => {
    setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, read: true } : c)))
  }, [])

  const markAllRead = useCallback(() => {
    setChanges((prev) => prev.map((c) => ({ ...c, read: true })))
  }, [])

  const clearAll = useCallback(() => setChanges([]), [])

  const unreadChanges = changes.filter((c) => !c.read)
  const unreadCount = unreadChanges.length
  const latestChangeMap = latestChangePerMatch(unreadChanges)
  const changedMatchIds = new Set(unreadChanges.map((c) => c.matchId))

  return {
    changes,
    appendChanges,
    unreadCount,
    latestChangeMap,
    changedMatchIds,
    markRead,
    markAllRead,
    clearAll,
    alertPrefs,
    alertPrefsRef,
    setAlertPrefs,
  }
}
