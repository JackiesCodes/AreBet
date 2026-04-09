"use client"

import type { StatusFilter } from "@/types/match"
import { STORAGE_KEYS, readJSON, writeJSON } from "./stickiness"

export interface UiState {
  activeLeague: string | null
  quickFilter: StatusFilter
  view: "card" | "table"
  search: string
}

export const DEFAULT_UI_STATE: UiState = {
  activeLeague: null,
  quickFilter: "all",
  view: "card",
  search: "",
}

export function loadUiState(): UiState {
  return { ...DEFAULT_UI_STATE, ...readJSON<Partial<UiState>>(STORAGE_KEYS.uiState, {}) }
}

export function saveUiState(state: UiState): void {
  writeJSON(STORAGE_KEYS.uiState, state)
}
