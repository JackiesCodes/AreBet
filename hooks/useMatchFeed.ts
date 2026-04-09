"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Match, MatchFeed } from "@/types/match"

interface UseMatchFeedOptions {
  pollIntervalMs?: number
  pauseWhenHidden?: boolean
}

interface MatchFeedState {
  matches: Match[]
  loading: boolean
  error: string | null
  fetchedAt: string | null
  refresh: () => void
}

/**
 * Polling hook that fetches the match feed at a given interval.
 * Pauses while the document is hidden (Page Visibility API) when enabled.
 */
export function useMatchFeed({
  pollIntervalMs = 30_000,
  pauseWhenHidden = true,
}: UseMatchFeedOptions = {}): MatchFeedState {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const aliveRef = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef(false)

  const tick = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const res = await fetch("/api/matches", { cache: "no-store" })
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`)
      const feed = (await res.json()) as MatchFeed
      if (!aliveRef.current) return
      setMatches(feed.matches ?? [])
      setFetchedAt(feed.fetchedAt ?? null)
      setError(null)
    } catch (err) {
      if (!aliveRef.current) return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      inFlightRef.current = false
      if (aliveRef.current) setLoading(false)
    }
  }, [])

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (pauseWhenHidden && typeof document !== "undefined" && document.hidden) {
        schedule()
        return
      }
      await tick()
      schedule()
    }, pollIntervalMs)
  }, [pollIntervalMs, pauseWhenHidden, tick])

  useEffect(() => {
    aliveRef.current = true
    void tick()
    schedule()

    const onVis = () => {
      if (!document.hidden) void tick()
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis)
    }
    return () => {
      aliveRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis)
      }
    }
  }, [tick, schedule])

  return { matches, loading, error, fetchedAt, refresh: () => void tick() }
}
