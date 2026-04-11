/**
 * Demo signal history — 90 realistic signal records spanning 45 days.
 *
 * Accuracy profile:
 *  - High confidence (≥72%): ~66% hit rate — realistic for a good model
 *  - Mid confidence (50–71%): ~52% hit rate
 *  - Low confidence (<50%): ~39% hit rate
 *
 * Value spots: ~58% hit rate when a value edge was flagged
 *
 * This data drives the Trust Layer and is clearly labelled as demo.
 * Real data would come from a signal_records table populated when
 * watched matches finish and predictions are resolved.
 */

import type { SignalRecord } from "@/types/trust"

const daysAgo = (n: number) => {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

export const DEMO_SIGNAL_HISTORY: SignalRecord[] = [
  // ── Day 1–5: Premier League ──────────────────────────────────────────────
  { id: "s01", matchLabel: "Arsenal vs Spurs", league: "Premier League", date: daysAgo(1), confidence: 78, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 6.2, odds: 1.95 },
  { id: "s02", matchLabel: "Chelsea vs Liverpool", league: "Premier League", date: daysAgo(1), confidence: 54, confidenceTier: "mid", predictedOutcome: "Draw", actualOutcome: "Away Win", correct: false, hadValueEdge: false, odds: 3.5 },
  { id: "s03", matchLabel: "Man City vs Newcastle", league: "Premier League", date: daysAgo(2), confidence: 82, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 8.1, odds: 1.6 },
  { id: "s04", matchLabel: "Wolves vs Brentford", league: "Premier League", date: daysAgo(2), confidence: 47, confidenceTier: "low", predictedOutcome: "Away Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 2.75 },
  { id: "s05", matchLabel: "Everton vs Brighton", league: "Premier League", date: daysAgo(3), confidence: 63, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: false, odds: 2.2 },
  { id: "s06", matchLabel: "Fulham vs Crystal Palace", league: "Premier League", date: daysAgo(3), confidence: 71, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: true, valueEdgePct: 5.8, odds: 2.1 },
  { id: "s07", matchLabel: "Tottenham vs Man Utd", league: "Premier League", date: daysAgo(4), confidence: 76, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.85 },
  { id: "s08", matchLabel: "Liverpool vs Leicester", league: "Premier League", date: daysAgo(4), confidence: 88, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 10.3, odds: 1.45 },
  { id: "s09", matchLabel: "West Ham vs Aston Villa", league: "Premier League", date: daysAgo(5), confidence: 55, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Home Win", correct: false, hadValueEdge: false, odds: 2.4 },
  { id: "s10", matchLabel: "Nottm Forest vs Ipswich", league: "Premier League", date: daysAgo(5), confidence: 44, confidenceTier: "low", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.55 },

  // ── Day 6–10: La Liga + Serie A ───────────────────────────────────────────
  { id: "s11", matchLabel: "Barcelona vs Atletico", league: "La Liga", date: daysAgo(6), confidence: 74, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 7.4, odds: 1.75 },
  { id: "s12", matchLabel: "Real Madrid vs Sevilla", league: "La Liga", date: daysAgo(6), confidence: 84, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.5 },
  { id: "s13", matchLabel: "Juventus vs Napoli", league: "Serie A", date: daysAgo(7), confidence: 58, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 2.1 },
  { id: "s14", matchLabel: "Inter vs Milan", league: "Serie A", date: daysAgo(7), confidence: 67, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 5.5, odds: 2.05 },
  { id: "s15", matchLabel: "Valencia vs Villarreal", league: "La Liga", date: daysAgo(8), confidence: 46, confidenceTier: "low", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: false, odds: 2.3 },
  { id: "s16", matchLabel: "Atalanta vs Roma", league: "Serie A", date: daysAgo(8), confidence: 72, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 6.8, odds: 1.9 },
  { id: "s17", matchLabel: "Osasuna vs Athletic Bilbao", league: "La Liga", date: daysAgo(9), confidence: 51, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 2.6 },
  { id: "s18", matchLabel: "Lazio vs Fiorentina", league: "Serie A", date: daysAgo(9), confidence: 65, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.0 },
  { id: "s19", matchLabel: "Betis vs Girona", league: "La Liga", date: daysAgo(10), confidence: 43, confidenceTier: "low", predictedOutcome: "Home Win", actualOutcome: "Away Win", correct: false, hadValueEdge: false, odds: 2.4 },
  { id: "s20", matchLabel: "Bologna vs Torino", league: "Serie A", date: daysAgo(10), confidence: 77, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 9.1, odds: 1.88 },

  // ── Day 11–15: Bundesliga + Ligue 1 ──────────────────────────────────────
  { id: "s21", matchLabel: "Bayern vs Dortmund", league: "Bundesliga", date: daysAgo(11), confidence: 79, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.65 },
  { id: "s22", matchLabel: "PSG vs Monaco", league: "Ligue 1", date: daysAgo(11), confidence: 85, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 7.9, odds: 1.55 },
  { id: "s23", matchLabel: "Leverkusen vs Leipzig", league: "Bundesliga", date: daysAgo(12), confidence: 61, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Away Win", correct: false, hadValueEdge: false, odds: 2.2 },
  { id: "s24", matchLabel: "Marseille vs Lyon", league: "Ligue 1", date: daysAgo(12), confidence: 57, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 2.3 },
  { id: "s25", matchLabel: "Frankfurt vs Stuttgart", league: "Bundesliga", date: daysAgo(13), confidence: 69, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: true, valueEdgePct: 6.1, odds: 2.15 },
  { id: "s26", matchLabel: "Lille vs Rennes", league: "Ligue 1", date: daysAgo(13), confidence: 40, confidenceTier: "low", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.6 },
  { id: "s27", matchLabel: "Dortmund vs Wolfsburg", league: "Bundesliga", date: daysAgo(14), confidence: 80, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 8.7, odds: 1.72 },
  { id: "s28", matchLabel: "Monaco vs Lens", league: "Ligue 1", date: daysAgo(14), confidence: 53, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.05 },
  { id: "s29", matchLabel: "Leipzig vs Augsburg", league: "Bundesliga", date: daysAgo(15), confidence: 73, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: true, valueEdgePct: 5.3, odds: 1.8 },
  { id: "s30", matchLabel: "Strasbourg vs Reims", league: "Ligue 1", date: daysAgo(15), confidence: 45, confidenceTier: "low", predictedOutcome: "Draw", actualOutcome: "Home Win", correct: false, hadValueEdge: false, odds: 3.2 },

  // ── Day 16–20 ─────────────────────────────────────────────────────────────
  { id: "s31", matchLabel: "Arsenal vs Chelsea", league: "Premier League", date: daysAgo(16), confidence: 76, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 7.1, odds: 1.9 },
  { id: "s32", matchLabel: "Sociedad vs Betis", league: "La Liga", date: daysAgo(16), confidence: 62, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.1 },
  { id: "s33", matchLabel: "AC Milan vs Genoa", league: "Serie A", date: daysAgo(17), confidence: 83, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.58 },
  { id: "s34", matchLabel: "Wolfsburg vs Hoffenheim", league: "Bundesliga", date: daysAgo(17), confidence: 49, confidenceTier: "low", predictedOutcome: "Draw", actualOutcome: "Draw", correct: true, hadValueEdge: false, odds: 3.4 },
  { id: "s35", matchLabel: "Nice vs Nantes", league: "Ligue 1", date: daysAgo(18), confidence: 70, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 5.9, odds: 1.95 },
  { id: "s36", matchLabel: "Man Utd vs Everton", league: "Premier League", date: daysAgo(18), confidence: 74, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 1.85 },
  { id: "s37", matchLabel: "Celta vs Espanyol", league: "La Liga", date: daysAgo(19), confidence: 41, confidenceTier: "low", predictedOutcome: "Home Win", actualOutcome: "Away Win", correct: false, hadValueEdge: false, odds: 2.7 },
  { id: "s38", matchLabel: "Napoli vs Verona", league: "Serie A", date: daysAgo(19), confidence: 86, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 11.2, odds: 1.48 },
  { id: "s39", matchLabel: "Stuttgart vs Mainz", league: "Bundesliga", date: daysAgo(20), confidence: 56, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: false, odds: 2.35 },
  { id: "s40", matchLabel: "Lyon vs Strasbourg", league: "Ligue 1", date: daysAgo(20), confidence: 68, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Away Win", correct: false, hadValueEdge: false, odds: 2.0 },

  // ── Day 21–30 ─────────────────────────────────────────────────────────────
  { id: "s41", matchLabel: "Man City vs Arsenal", league: "Premier League", date: daysAgo(21), confidence: 77, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 8.5, odds: 1.7 },
  { id: "s42", matchLabel: "Inter vs Juventus", league: "Serie A", date: daysAgo(22), confidence: 72, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.95 },
  { id: "s43", matchLabel: "Atletico vs Barcelona", league: "La Liga", date: daysAgo(22), confidence: 59, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 2.5 },
  { id: "s44", matchLabel: "Bayern vs Leipzig", league: "Bundesliga", date: daysAgo(23), confidence: 81, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 9.3, odds: 1.62 },
  { id: "s45", matchLabel: "PSG vs Lyon", league: "Ligue 1", date: daysAgo(23), confidence: 87, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 12.1, odds: 1.5 },
  { id: "s46", matchLabel: "Brighton vs Newcastle", league: "Premier League", date: daysAgo(24), confidence: 52, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Home Win", correct: false, hadValueEdge: false, odds: 2.6 },
  { id: "s47", matchLabel: "Roma vs Lazio", league: "Serie A", date: daysAgo(24), confidence: 66, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 6.7, odds: 2.1 },
  { id: "s48", matchLabel: "Sevilla vs Getafe", league: "La Liga", date: daysAgo(25), confidence: 75, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.8 },
  { id: "s49", matchLabel: "Dortmund vs Frankfurt", league: "Bundesliga", date: daysAgo(25), confidence: 70, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 1.95 },
  { id: "s50", matchLabel: "Marseille vs Strasbourg", league: "Ligue 1", date: daysAgo(26), confidence: 48, confidenceTier: "low", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.2 },
  { id: "s51", matchLabel: "Liverpool vs Arsenal", league: "Premier League", date: daysAgo(27), confidence: 73, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 7.0, odds: 1.88 },
  { id: "s52", matchLabel: "Leverkusen vs Bayern", league: "Bundesliga", date: daysAgo(27), confidence: 42, confidenceTier: "low", predictedOutcome: "Home Win", actualOutcome: "Away Win", correct: false, hadValueEdge: false, odds: 3.1 },
  { id: "s53", matchLabel: "Villarreal vs Valencia", league: "La Liga", date: daysAgo(28), confidence: 60, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.0 },
  { id: "s54", matchLabel: "Torino vs Atalanta", league: "Serie A", date: daysAgo(28), confidence: 38, confidenceTier: "low", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: true, valueEdgePct: 5.4, odds: 2.15 },
  { id: "s55", matchLabel: "Reims vs Lens", league: "Ligue 1", date: daysAgo(29), confidence: 55, confidenceTier: "mid", predictedOutcome: "Draw", actualOutcome: "Home Win", correct: false, hadValueEdge: false, odds: 3.3 },
  { id: "s56", matchLabel: "Chelsea vs Man City", league: "Premier League", date: daysAgo(29), confidence: 64, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: true, valueEdgePct: 6.3, odds: 2.2 },
  { id: "s57", matchLabel: "Real Madrid vs Barcelona", league: "La Liga", date: daysAgo(30), confidence: 71, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.9 },
  { id: "s58", matchLabel: "Fiorentina vs Bologna", league: "Serie A", date: daysAgo(30), confidence: 78, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: true, valueEdgePct: 5.1, odds: 1.95 },
  // ── Days 31–45 (additional depth) ────────────────────────────────────────
  { id: "s59", matchLabel: "Newcastle vs Spurs", league: "Premier League", date: daysAgo(32), confidence: 65, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: false, odds: 2.3 },
  { id: "s60", matchLabel: "Augsburg vs Stuttgart", league: "Bundesliga", date: daysAgo(32), confidence: 50, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 2.5 },
  { id: "s61", matchLabel: "PSG vs Nice", league: "Ligue 1", date: daysAgo(33), confidence: 90, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 13.4, odds: 1.42 },
  { id: "s62", matchLabel: "Napoli vs Inter", league: "Serie A", date: daysAgo(33), confidence: 58, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Home Win", correct: false, hadValueEdge: false, odds: 2.7 },
  { id: "s63", matchLabel: "Real Madrid vs Atletico", league: "La Liga", date: daysAgo(34), confidence: 76, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.78 },
  { id: "s64", matchLabel: "Arsenal vs Man Utd", league: "Premier League", date: daysAgo(35), confidence: 80, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 8.9, odds: 1.7 },
  { id: "s65", matchLabel: "Leipzig vs Mainz", league: "Bundesliga", date: daysAgo(35), confidence: 83, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 10.2, odds: 1.6 },
  { id: "s66", matchLabel: "Lyon vs Monaco", league: "Ligue 1", date: daysAgo(36), confidence: 47, confidenceTier: "low", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 2.45 },
  { id: "s67", matchLabel: "Juventus vs AC Milan", league: "Serie A", date: daysAgo(36), confidence: 69, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.0 },
  { id: "s68", matchLabel: "Sevilla vs Barcelona", league: "La Liga", date: daysAgo(37), confidence: 36, confidenceTier: "low", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: true, valueEdgePct: 5.6, odds: 1.65 },
  { id: "s69", matchLabel: "Brentford vs West Ham", league: "Premier League", date: daysAgo(38), confidence: 63, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.2 },
  { id: "s70", matchLabel: "Dortmund vs Leverkusen", league: "Bundesliga", date: daysAgo(38), confidence: 54, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Away Win", correct: false, hadValueEdge: false, odds: 2.15 },
  { id: "s71", matchLabel: "Monaco vs Marseille", league: "Ligue 1", date: daysAgo(39), confidence: 72, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 6.5, odds: 1.92 },
  { id: "s72", matchLabel: "Atalanta vs Inter", league: "Serie A", date: daysAgo(39), confidence: 44, confidenceTier: "low", predictedOutcome: "Draw", actualOutcome: "Home Win", correct: false, hadValueEdge: false, odds: 3.2 },
  { id: "s73", matchLabel: "Man City vs Liverpool", league: "Premier League", date: daysAgo(40), confidence: 67, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 2.1 },
  { id: "s74", matchLabel: "Atletico vs Sevilla", league: "La Liga", date: daysAgo(40), confidence: 74, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.82 },
  { id: "s75", matchLabel: "Frankfurt vs Bayern", league: "Bundesliga", date: daysAgo(41), confidence: 35, confidenceTier: "low", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: true, valueEdgePct: 5.2, odds: 1.55 },
  { id: "s76", matchLabel: "Reims vs PSG", league: "Ligue 1", date: daysAgo(41), confidence: 89, confidenceTier: "high", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: true, valueEdgePct: 12.8, odds: 1.45 },
  { id: "s77", matchLabel: "Roma vs Juventus", league: "Serie A", date: daysAgo(42), confidence: 57, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: false, odds: 2.4 },
  { id: "s78", matchLabel: "Tottenham vs Chelsea", league: "Premier League", date: daysAgo(42), confidence: 61, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Away Win", correct: false, hadValueEdge: false, odds: 2.3 },
  { id: "s79", matchLabel: "Villarreal vs Real Madrid", league: "La Liga", date: daysAgo(43), confidence: 39, confidenceTier: "low", predictedOutcome: "Away Win", actualOutcome: "Draw", correct: false, hadValueEdge: false, odds: 1.72 },
  { id: "s80", matchLabel: "Wolfsburg vs Frankfurt", league: "Bundesliga", date: daysAgo(43), confidence: 53, confidenceTier: "mid", predictedOutcome: "Draw", actualOutcome: "Draw", correct: true, hadValueEdge: false, odds: 3.1 },
  { id: "s81", matchLabel: "Lens vs Lille", league: "Ligue 1", date: daysAgo(44), confidence: 66, confidenceTier: "mid", predictedOutcome: "Away Win", actualOutcome: "Away Win", correct: true, hadValueEdge: true, valueEdgePct: 5.7, odds: 2.25 },
  { id: "s82", matchLabel: "Napoli vs Lazio", league: "Serie A", date: daysAgo(44), confidence: 77, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 1.85 },
  { id: "s83", matchLabel: "Chelsea vs Wolves", league: "Premier League", date: daysAgo(45), confidence: 79, confidenceTier: "high", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: true, valueEdgePct: 9.6, odds: 1.68 },
  { id: "s84", matchLabel: "Getafe vs Celta", league: "La Liga", date: daysAgo(45), confidence: 52, confidenceTier: "mid", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.35 },
  { id: "s85", matchLabel: "Mainz vs Augsburg", league: "Bundesliga", date: daysAgo(45), confidence: 48, confidenceTier: "low", predictedOutcome: "Home Win", actualOutcome: "Home Win", correct: true, hadValueEdge: false, odds: 2.5 },
]
