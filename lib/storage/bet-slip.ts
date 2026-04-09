"use client"

import type { BetSlipItem } from "@/types/bet"
import { STORAGE_KEYS, readJSON, writeJSON } from "./stickiness"

export function loadBetSlip(): BetSlipItem[] {
  return readJSON<BetSlipItem[]>(STORAGE_KEYS.betSlip, [])
}

export function saveBetSlip(items: BetSlipItem[]): void {
  writeJSON(STORAGE_KEYS.betSlip, items)
}

export function addToBetSlip(item: BetSlipItem): BetSlipItem[] {
  const current = loadBetSlip()
  const dedup = current.filter((i) => !(i.matchId === item.matchId && i.market === item.market))
  const next = [...dedup, item]
  saveBetSlip(next)
  return next
}

export function removeFromBetSlip(matchId: number, market: string): BetSlipItem[] {
  const current = loadBetSlip()
  const next = current.filter((i) => !(i.matchId === matchId && i.market === market))
  saveBetSlip(next)
  return next
}
