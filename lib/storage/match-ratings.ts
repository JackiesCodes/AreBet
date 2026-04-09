"use client"

import { STORAGE_KEYS, readJSON, writeJSON } from "./stickiness"

export type MatchRatings = Record<number, number>

export function loadMatchRatings(): MatchRatings {
  return readJSON<MatchRatings>(STORAGE_KEYS.ratings, {})
}

export function setMatchRating(matchId: number, rating: number): MatchRatings {
  const current = loadMatchRatings()
  const next = { ...current, [matchId]: Math.max(0, Math.min(5, rating)) }
  writeJSON(STORAGE_KEYS.ratings, next)
  return next
}

export function getMatchRating(matchId: number): number {
  const all = loadMatchRatings()
  return all[matchId] ?? 0
}
