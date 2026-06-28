"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useMatchFeed } from "@/hooks/useMatchFeed"
import type { Match } from "@/types/match"

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface MatchFeedContextValue {
  matches: Match[]
  loading: boolean
  error: string | null
  fetchedAt: string | null
  refresh: () => void
  hasLive: boolean
}

const MatchFeedContext = createContext<MatchFeedContextValue | null>(null)

export function useMatchFeedCtx(): MatchFeedContextValue {
  const ctx = useContext(MatchFeedContext)
  if (!ctx) throw new Error("useMatchFeedCtx must be used inside MatchFeedProvider")
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function MatchFeedProvider({ children }: { children: ReactNode }) {
  const { matches, loading, error, fetchedAt, refresh } = useMatchFeed()

  const hasLive = useMemo(() => matches.some((m) => m.status === "LIVE"), [matches])

  const value: MatchFeedContextValue = {
    matches,
    loading,
    error,
    fetchedAt,
    refresh,
    hasLive,
  }

  return (
    <MatchFeedContext.Provider value={value}>
      {children}
    </MatchFeedContext.Provider>
  )
}
