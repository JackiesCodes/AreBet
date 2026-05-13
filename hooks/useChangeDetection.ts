"use client"

import type { Match } from "@/types/match"
import type { MatchChange, AlertPreferences } from "@/types/alerts"
import { detectChanges } from "@/lib/utils/match-changes"

/**
 * Pure wrapper around the detectChanges utility.
 * Call this inside a polling tick to compute new changes
 * between the previous and next match snapshots.
 *
 * Returns an empty array if either snapshot is empty (first poll).
 */
export function computeChanges(
  prevMatches: Match[],
  nextMatches: Match[],
  watchedMatchIds: Set<string>,
  alertPrefs: AlertPreferences,
): MatchChange[] {
  if (prevMatches.length === 0 || nextMatches.length === 0) return []
  return detectChanges(prevMatches, nextMatches, watchedMatchIds, alertPrefs)
}
