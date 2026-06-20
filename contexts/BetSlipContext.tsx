"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BetMarket = 'MATCH_WINNER' | 'BTTS' | 'OVER_25' | 'UNDER_25' | 'DOUBLE_CHANCE'

export interface BetSlipItem {
  id: string // `${fixtureId}-${market}-${selection}`
  fixtureId: number
  matchLabel: string // "Team A vs Team B"
  league: string
  market: BetMarket
  marketLabel: string // "Match Winner", "Both Teams to Score", etc
  selection: string // 'HOME' | 'DRAW' | 'AWAY' | 'YES' | 'NO' | 'OVER' | 'UNDER'
  selectionLabel: string // "Home Win", "Draw", "Away Win", etc
  odds: number
  stake: number
  kickoffISO: string
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface BetSlipContextValue {
  selections: BetSlipItem[]
  addBet: (item: Omit<BetSlipItem, 'id' | 'stake'>) => void
  removeBet: (id: string) => void
  updateStake: (id: string, stake: number) => void
  clearSlip: () => void
  totalStake: number
  totalOdds: number
  potentialReturn: number
  isInSlip: (fixtureId: number, market: BetMarket, selection: string) => boolean
  betCount: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const BetSlipContext = createContext<BetSlipContextValue | null>(null)

export function useBetSlip(): BetSlipContextValue {
  const ctx = useContext(BetSlipContext)
  if (!ctx) throw new Error("useBetSlip must be used inside BetSlipProvider")
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSlipItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addBet = useCallback((item: Omit<BetSlipItem, 'id' | 'stake'>) => {
    const id = `${item.fixtureId}-${item.market}-${item.selection}`
    setSelections((prev) => {
      // Dedup: if already in slip, remove it (toggle off)
      const exists = prev.some((s) => s.id === id)
      if (exists) {
        return prev.filter((s) => s.id !== id)
      }
      return [...prev, { ...item, id, stake: 10 }]
    })
    setIsOpen(true)
  }, [])

  const removeBet = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const updateStake = useCallback((id: string, stake: number) => {
    setSelections((prev) =>
      prev.map((s) => s.id === id ? { ...s, stake } : s)
    )
  }, [])

  const clearSlip = useCallback(() => {
    setSelections([])
  }, [])

  const isInSlip = useCallback(
    (fixtureId: number, market: BetMarket, selection: string): boolean => {
      const id = `${fixtureId}-${market}-${selection}`
      return selections.some((s) => s.id === id)
    },
    [selections]
  )

  const totalStake = useMemo(
    () => selections.reduce((sum, s) => sum + (s.stake || 0), 0),
    [selections]
  )

  const totalOdds = useMemo(
    () => selections.reduce((product, s) => product * s.odds, 1),
    [selections]
  )

  const potentialReturn = useMemo(
    () => totalStake * totalOdds,
    [totalStake, totalOdds]
  )

  const betCount = selections.length

  const value: BetSlipContextValue = {
    selections,
    addBet,
    removeBet,
    updateStake,
    clearSlip,
    totalStake,
    totalOdds,
    potentialReturn,
    isInSlip,
    betCount,
    isOpen,
    setIsOpen,
  }

  return (
    <BetSlipContext.Provider value={value}>
      {children}
    </BetSlipContext.Provider>
  )
}
