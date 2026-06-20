"use client"

import { useBetSlip, type BetMarket } from "@/contexts/BetSlipContext"
import { cn } from "@/lib/utils/cn"

interface OddsButtonProps {
  fixtureId: number
  matchLabel: string
  league: string
  market: BetMarket
  marketLabel: string
  selection: string
  selectionLabel: string
  odds: number
  kickoffISO: string
  className?: string
}

export function OddsButton({
  fixtureId,
  matchLabel,
  league,
  market,
  marketLabel,
  selection,
  selectionLabel,
  odds,
  kickoffISO,
  className,
}: OddsButtonProps) {
  const { addBet, isInSlip } = useBetSlip()
  const active = isInSlip(fixtureId, market, selection)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    addBet({
      fixtureId,
      matchLabel,
      league,
      market,
      marketLabel,
      selection,
      selectionLabel,
      odds,
      kickoffISO,
    })
  }

  return (
    <button
      type="button"
      className={cn("odds-btn", active && "odds-btn--active", className)}
      onClick={handleClick}
      aria-label={`${selectionLabel} at odds ${odds.toFixed(2)}, ${active ? "remove from" : "add to"} bet slip`}
      aria-pressed={active}
    >
      <span className="odds-btn-label">{selectionLabel}</span>
      <span className="odds-btn-odds">{odds.toFixed(2)}</span>
    </button>
  )
}
