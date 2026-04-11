/** Types for the Match Change Intelligence system */

export type ChangeType =
  | "went_live"
  | "goal"
  | "red_card"
  | "value_appeared"
  | "value_disappeared"
  | "odds_drift"
  | "confidence_up"
  | "confidence_down"
  | "kickoff_soon"
  | "match_finished"

/** visual severity — drives colour + ordering in AlertCenter */
export type ChangeSeverity = "critical" | "high" | "medium" | "low"

export interface MatchChange {
  /** unique per detection: matchId + changeType + ts */
  id: string
  matchId: number
  matchLabel: string
  league: string
  type: ChangeType
  severity: ChangeSeverity
  /** One-line summary shown in AlertCenter */
  summary: string
  /** Optional extra detail (score, player, edge %) */
  detail?: string
  /** Unix ms timestamp of detection */
  ts: number
  read: boolean
  /** True if the match was on the user's watchlist when detected */
  watchedMatch: boolean
}

/** Config for which change types a user wants surfaced */
export interface AlertPreferences {
  goals: boolean
  redCards: boolean
  valueAppeared: boolean
  valueDisappeared: boolean
  oddsDrift: boolean
  confidenceUp: boolean
  confidenceDown: boolean
  kickoffSoon: boolean
  wentLive: boolean
  matchFinished: boolean
  /** Only alert for watched matches (false = alert for all matches) */
  watchedOnly: boolean
}

export const DEFAULT_ALERT_PREFS: AlertPreferences = {
  goals: true,
  redCards: true,
  valueAppeared: true,
  valueDisappeared: false,
  oddsDrift: false,
  confidenceUp: true,
  confidenceDown: false,
  kickoffSoon: true,
  wentLive: true,
  matchFinished: false,
  watchedOnly: false,
}
