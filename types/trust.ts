/**
 * AreBet Trust Layer — types for model performance transparency.
 *
 * A SignalRecord is one prediction AreBet made on a completed match.
 * When enough SignalRecords accumulate, the Trust Layer can show:
 *  - overall model hit rate
 *  - confidence calibration (does 70% confidence → 70% hit rate?)
 *  - value spot track record
 *  - hit rates by confidence tier and signal type
 */

export type ConfidenceTierLabel = "High (≥72%)" | "Mid (50–71%)" | "Low (<50%)"

export interface SignalRecord {
  id: string
  matchLabel: string
  league: string
  date: string               // ISO date string YYYY-MM-DD
  confidence: number         // 0–100 as predicted before match
  confidenceTier: "high" | "mid" | "low"
  predictedOutcome: string   // e.g. "Home Win", "Over 2.5", "BTTS"
  actualOutcome: string      // what actually happened
  correct: boolean           // did the prediction resolve correctly?
  hadValueEdge: boolean      // was a value edge flagged?
  valueEdgePct?: number      // edge % when flagged
  odds?: number              // market odds at time of signal
}

/** One bucket in the calibration chart */
export interface CalibrationPoint {
  label: string              // e.g. "60–65%"
  midpoint: number           // e.g. 62.5
  totalSignals: number
  hitRate: number            // actual hit rate 0–100
  /** hitRate close to midpoint = well-calibrated */
  calibrationError: number   // |hitRate - midpoint|
}

/** Aggregated stats by confidence tier */
export interface TierPerformance {
  tier: "high" | "mid" | "low"
  label: ConfidenceTierLabel
  totalSignals: number
  correctSignals: number
  hitRate: number            // 0–100
  avgConfidence: number      // 0–100
  avgOdds: number
  roi: number                // % if you followed every signal at avg odds
}

/** Value spot track record */
export interface ValueSpotRecord {
  totalFlagged: number
  profitableCount: number    // flagged as value AND prediction correct
  hitRate: number            // 0–100
  avgEdgePct: number         // avg edge % when flagged
  roi: number                // % roi if you backed every value flag at given odds
}

/** Overall model summary */
export interface ModelSummary {
  totalSignals: number
  correctSignals: number
  hitRate: number            // 0–100
  avgConfidence: number      // 0–100
  avgOdds: number
  roi: number
  dataFrom: string           // earliest date in sample
  dataTo: string             // latest date in sample
  isDemo: boolean
}
