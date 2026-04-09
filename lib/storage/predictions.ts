"use client"

import { STORAGE_KEYS, readJSON, writeJSON } from "./stickiness"

export interface UserPrediction {
  matchId: number
  selection: "HOME" | "DRAW" | "AWAY"
  confidence: number // 0..100
  created_at: string
}

export function loadUserPredictions(): UserPrediction[] {
  return readJSON<UserPrediction[]>(STORAGE_KEYS.predictions, [])
}

export function addUserPrediction(p: UserPrediction): UserPrediction[] {
  const current = loadUserPredictions()
  const dedup = current.filter((x) => x.matchId !== p.matchId)
  const next = [...dedup, p]
  writeJSON(STORAGE_KEYS.predictions, next)
  return next
}
