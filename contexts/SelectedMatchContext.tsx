"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import type { Match } from "@/types/match"

interface SelectedMatchCtx {
  selectedLeagueId: number | null
  selectedLeagueName: string | null
  selectedLeagueCountry: string | null
  setSelectedMatch: (match: Match | null) => void
}

const Ctx = createContext<SelectedMatchCtx | null>(null)

export function SelectedMatchProvider({ children }: { children: ReactNode }) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null)
  const [selectedLeagueName, setSelectedLeagueName] = useState<string | null>(null)
  const [selectedLeagueCountry, setSelectedLeagueCountry] = useState<string | null>(null)

  const setSelectedMatch = useCallback((match: Match | null) => {
    if (match === null) {
      setSelectedLeagueId(null)
      setSelectedLeagueName(null)
      setSelectedLeagueCountry(null)
    } else {
      setSelectedLeagueId(match.leagueId ?? null)
      setSelectedLeagueName(match.league)
      setSelectedLeagueCountry(match.country)
    }
  }, [])

  return (
    <Ctx.Provider value={{ selectedLeagueId, selectedLeagueName, selectedLeagueCountry, setSelectedMatch }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSelectedMatch(): SelectedMatchCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useSelectedMatch must be inside SelectedMatchProvider")
  return ctx
}
