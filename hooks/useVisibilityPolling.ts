"use client"

import { useCallback, useEffect, useRef } from "react"

const POLL_MS_IDLE = 30_000
const POLL_MS_LIVE = 10_000

/**
 * Manages adaptive polling with Page Visibility API support.
 * - 10s interval when live matches exist, 30s otherwise
 * - Pauses when the tab is hidden, resumes immediately on visibility
 * - Aborts in-flight requests on unmount
 *
 * @param tick - async callback executed on each poll tick
 * @param getHasLive - function that returns true if live matches currently exist
 */
export function useVisibilityPolling(
  tick: (signal: AbortSignal) => Promise<void>,
  getHasLive: () => boolean,
) {
  const aliveRef = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const schedule = useCallback((hasLive: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const delay = hasLive ? POLL_MS_LIVE : POLL_MS_IDLE
    timerRef.current = setTimeout(async () => {
      if (!aliveRef.current) return
      if (typeof document !== "undefined" && document.hidden) {
        // Tab is hidden — reschedule without polling
        schedule(getHasLive())
        return
      }
      abortControllerRef.current = new AbortController()
      await tick(abortControllerRef.current.signal)
      if (aliveRef.current) schedule(getHasLive())
    }, delay)
  }, [tick, getHasLive])

  useEffect(() => {
    aliveRef.current = true

    // Initial poll
    abortControllerRef.current = new AbortController()
    void tick(abortControllerRef.current.signal).then(() => {
      if (aliveRef.current) schedule(getHasLive())
    })

    // Resume polling immediately on tab focus
    const onVisibilityChange = () => {
      if (!document.hidden && aliveRef.current) {
        abortControllerRef.current = new AbortController()
        void tick(abortControllerRef.current.signal)
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      aliveRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      abortControllerRef.current?.abort()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [tick, schedule, getHasLive])
}
