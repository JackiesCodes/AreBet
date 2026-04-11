/**
 * Match Change Detection Engine
 *
 * Pure functions that compare two snapshots of the match list and
 * produce a list of meaningful MatchChange events.
 *
 * This is the intelligence layer that makes AreBet feel alive —
 * detecting goals, value appearances, odds movement, confidence
 * shifts, and status transitions between feed refreshes.
 */

import type { Match } from "@/types/match"
import type { MatchChange, ChangeType, ChangeSeverity, AlertPreferences } from "@/types/alerts"
import { calculateValueEdge } from "./value-bet"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _seq = 0
function mkId(matchId: number, type: ChangeType): string {
  return `${matchId}-${type}-${++_seq}`
}

function mkChange(
  matchId: number,
  matchLabel: string,
  league: string,
  type: ChangeType,
  severity: ChangeSeverity,
  summary: string,
  detail: string | undefined,
  watchedMatch: boolean,
): MatchChange {
  return {
    id: mkId(matchId, type),
    matchId,
    matchLabel,
    league,
    type,
    severity,
    summary,
    detail,
    ts: Date.now(),
    read: false,
    watchedMatch,
  }
}

// ---------------------------------------------------------------------------
// Core detector
// ---------------------------------------------------------------------------

/**
 * Compare two complete match snapshots and return every meaningful change.
 *
 * @param prev   - previous poll result
 * @param next   - current poll result
 * @param watched - Set of match-id strings that the user is following
 * @param prefs  - which change types the user wants surfaced
 */
export function detectChanges(
  prev: Match[],
  next: Match[],
  watched: Set<string>,
  prefs: AlertPreferences,
): MatchChange[] {
  const changes: MatchChange[] = []
  const prevMap = new Map(prev.map((m) => [m.id, m]))

  for (const match of next) {
    const prevMatch = prevMap.get(match.id)
    // If the match wasn't in the previous snapshot, skip
    // (first-poll additions don't generate alerts)
    if (!prevMatch) continue

    const isWatched = watched.has(String(match.id))
    if (prefs.watchedOnly && !isWatched) continue

    const label = `${match.home.name} vs ${match.away.name}`

    // ── Status: went live ──────────────────────────────────────────────────
    if (
      prefs.wentLive &&
      prevMatch.status !== "LIVE" &&
      match.status === "LIVE"
    ) {
      changes.push(
        mkChange(match.id, label, match.league, "went_live", "critical",
          "Match just went live",
          match.venue ? match.venue : undefined,
          isWatched)
      )
    }

    // ── Status: finished ───────────────────────────────────────────────────
    if (
      prefs.matchFinished &&
      prevMatch.status !== "FINISHED" &&
      match.status === "FINISHED"
    ) {
      changes.push(
        mkChange(match.id, label, match.league, "match_finished", "medium",
          "Match finished",
          `FT ${match.score.home}–${match.score.away}`,
          isWatched)
      )
    }

    // ── Goals ──────────────────────────────────────────────────────────────
    if (prefs.goals) {
      const prevGoals = prevMatch.events.filter((e) => e.type === "goal")
      const nextGoals = match.events.filter((e) => e.type === "goal")
      if (nextGoals.length > prevGoals.length) {
        // Most recent goal event
        const newest = nextGoals[nextGoals.length - 1]
        const scorer = newest?.player ?? "Unknown"
        const teamSide = newest?.team === "home" ? match.home.short : match.away.short
        changes.push(
          mkChange(match.id, label, match.league, "goal", "critical",
            `⚽ Goal — ${teamSide}`,
            `${scorer} · ${match.score.home}–${match.score.away} (${match.minute ?? "?"}')`,
            isWatched)
        )
      }
    }

    // ── Red cards ──────────────────────────────────────────────────────────
    if (prefs.redCards) {
      const isRed = (detail?: string) =>
        !!detail && (detail.toLowerCase().includes("red") || detail.toLowerCase().includes("straight"))
      const prevReds = prevMatch.events.filter((e) => e.type === "card" && isRed(e.detail)).length
      const nextReds = match.events.filter((e) => e.type === "card" && isRed(e.detail)).length
      if (nextReds > prevReds) {
        const newest = match.events.findLast((e) => e.type === "card" && isRed(e.detail))
        const teamSide = newest?.team === "home" ? match.home.short : match.away.short
        changes.push(
          mkChange(match.id, label, match.league, "red_card", "high",
            `🟥 Red card — ${teamSide}`,
            newest?.player ? `${newest.player} off (${newest.minute}')` : undefined,
            isWatched)
        )
      }
    }

    // ── Value edge appeared / disappeared ──────────────────────────────────
    const prevEdge = calculateValueEdge(prevMatch)
    const nextEdge = calculateValueEdge(match)

    if (prefs.valueAppeared && !prevEdge?.isValue && nextEdge?.isValue) {
      changes.push(
        mkChange(match.id, label, match.league, "value_appeared", "high",
          "▲ Value spot appeared",
          `${nextEdge.selection.toUpperCase()} @ ${nextEdge.odds.toFixed(2)} · +${(nextEdge.edge * 100).toFixed(1)}% edge`,
          isWatched)
      )
    }

    if (prefs.valueDisappeared && prevEdge?.isValue && !nextEdge?.isValue) {
      changes.push(
        mkChange(match.id, label, match.league, "value_disappeared", "medium",
          "Value spot closed",
          prevEdge
            ? `Was ${prevEdge.selection.toUpperCase()} — edge fell below threshold`
            : undefined,
          isWatched)
      )
    }

    // ── Odds drift (>5% move on 1X2 line) ─────────────────────────────────
    if (prefs.oddsDrift && match.odds && prevMatch.odds) {
      for (const side of ["home", "draw", "away"] as const) {
        const prev = prevMatch.odds[side]
        const curr = match.odds[side]
        if (prev > 1 && curr > 1) {
          const drift = (curr - prev) / prev
          if (Math.abs(drift) >= 0.05) {
            const dir = drift < 0 ? "steamed in ↓" : "drifted out ↑"
            const sideLabel = side === "home"
              ? match.home.short
              : side === "away"
              ? match.away.short
              : "Draw"
            changes.push(
              mkChange(match.id, label, match.league, "odds_drift", "medium",
                "Market move detected",
                `${sideLabel} ${dir}: ${prev.toFixed(2)} → ${curr.toFixed(2)}`,
                isWatched)
            )
            break // one drift alert per match per poll
          }
        }
      }
    }

    // ── Confidence shift (±8 points) ──────────────────────────────────────
    const prevConf = prevMatch.prediction?.confidence ?? 0
    const nextConf = match.prediction?.confidence ?? 0
    const confDelta = nextConf - prevConf

    if (prefs.confidenceUp && confDelta >= 8) {
      changes.push(
        mkChange(match.id, label, match.league, "confidence_up", "medium",
          "Confidence rising ↑",
          `${Math.round(prevConf)}% → ${Math.round(nextConf)}%`,
          isWatched)
      )
    } else if (prefs.confidenceDown && confDelta <= -8) {
      changes.push(
        mkChange(match.id, label, match.league, "confidence_down", "low",
          "Confidence falling ↓",
          `${Math.round(prevConf)}% → ${Math.round(nextConf)}%`,
          isWatched)
      )
    }

    // ── Kickoff soon (crosses 30-min threshold) ────────────────────────────
    if (prefs.kickoffSoon && match.status === "UPCOMING") {
      const msToKickoff = new Date(match.kickoffISO).getTime() - Date.now()
      const prevMs = new Date(prevMatch.kickoffISO).getTime() - Date.now()
      if (msToKickoff > 0 && msToKickoff <= 30 * 60_000 && prevMs > 30 * 60_000) {
        const mins = Math.ceil(msToKickoff / 60_000)
        changes.push(
          mkChange(match.id, label, match.league, "kickoff_soon", "medium",
            "Kicking off soon",
            `${mins} min until kickoff`,
            isWatched)
        )
      }
    }
  }

  return changes
}

// ---------------------------------------------------------------------------
// Helpers for consumers
// ---------------------------------------------------------------------------

export const CHANGE_ICONS: Record<ChangeType, string> = {
  went_live:           "●",
  goal:                "⚽",
  red_card:            "🟥",
  value_appeared:      "▲",
  value_disappeared:   "▽",
  odds_drift:          "⇄",
  confidence_up:       "↑",
  confidence_down:     "↓",
  kickoff_soon:        "⏱",
  match_finished:      "■",
}

export const CHANGE_SEVERITY_ORDER: Record<ChangeSeverity, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
}

/** Latest change per match, sorted by severity then recency */
export function latestChangePerMatch(changes: MatchChange[]): Map<number, MatchChange> {
  const map = new Map<number, MatchChange>()
  for (const c of changes) {
    const existing = map.get(c.matchId)
    if (
      !existing ||
      CHANGE_SEVERITY_ORDER[c.severity] < CHANGE_SEVERITY_ORDER[existing.severity] ||
      (c.severity === existing.severity && c.ts > existing.ts)
    ) {
      map.set(c.matchId, c)
    }
  }
  return map
}

/** Format relative time for alert timestamps */
export function relativeTime(ts: number): string {
  const diff = Math.round((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}
