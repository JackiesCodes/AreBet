"use client"

import type { FavoriteEntityType, UserPreferences } from "@/types/user"

export const STORAGE_KEYS = {
  preferences: "arebet:preferences:v1",
  favorites: "arebet:favorites:v1",
  theme: "arebet:theme:v1",
  density: "arebet:density:v1",
  uiState: "arebet:ui:v1",
  betSlip: "arebet:bet-slip:v1",
  ratings: "arebet:ratings:v1",
  predictions: "arebet:predictions:v1",
  onboarding: "arebet:onboarding:v1",
} as const

export interface LocalFavorite {
  entity_type: FavoriteEntityType
  entity_id: string
  label: string
  meta?: Record<string, unknown>
  created_at: string
}

export type LocalPreferences = UserPreferences

export const DEFAULT_PREFERENCES: LocalPreferences = {
  density: "compact",
  default_sort: "kickoff",
  default_filter_status: "live",
  show_favorites_first: true,
  hide_finished: false,
  odds_format: "decimal",
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or serialization errors swallowed */
  }
}

export function removeKey(key: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function loadLocalPreferences(): LocalPreferences {
  return { ...DEFAULT_PREFERENCES, ...readJSON<Partial<LocalPreferences>>(STORAGE_KEYS.preferences, {}) }
}

export function saveLocalPreferences(prefs: LocalPreferences): void {
  writeJSON(STORAGE_KEYS.preferences, prefs)
}

export function loadLocalFavorites(): LocalFavorite[] {
  return readJSON<LocalFavorite[]>(STORAGE_KEYS.favorites, [])
}

export function saveLocalFavorites(favs: LocalFavorite[]): void {
  writeJSON(STORAGE_KEYS.favorites, favs)
}
