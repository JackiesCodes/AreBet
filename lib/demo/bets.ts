import type { BetRecord } from "@/types/bet"

const dayAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

export const DEMO_BETS: BetRecord[] = [
  { id: "b1", matchId: 1001, market: "1X2", selection: "HOME", stake: 25, odds: 2.1, result: "WIN", league: "Premier League", teams: "Arsenal vs Spurs", created_at: dayAgo(1) },
  { id: "b2", matchId: 1002, market: "BTTS", selection: "YES", stake: 15, odds: 1.85, result: "WIN", league: "La Liga", teams: "Barcelona vs Madrid", created_at: dayAgo(1) },
  { id: "b3", matchId: 1003, market: "OVER25", selection: "OVER", stake: 20, odds: 1.95, result: "LOSS", league: "Serie A", teams: "Juventus vs Inter", created_at: dayAgo(2) },
  { id: "b4", matchId: 1004, market: "1X2", selection: "AWAY", stake: 30, odds: 2.4, result: "WIN", league: "Bundesliga", teams: "Dortmund vs Bayern", created_at: dayAgo(2) },
  { id: "b5", matchId: 1005, market: "1X2", selection: "DRAW", stake: 10, odds: 3.4, result: "WIN", league: "Ligue 1", teams: "Lyon vs Marseille", created_at: dayAgo(3) },
  { id: "b6", matchId: 1006, market: "BTTS", selection: "NO", stake: 25, odds: 2.0, result: "LOSS", league: "Premier League", teams: "Chelsea vs Liverpool", created_at: dayAgo(3) },
  { id: "b7", matchId: 1007, market: "OVER25", selection: "OVER", stake: 50, odds: 1.75, result: "WIN", league: "Bundesliga", teams: "Leipzig vs Frankfurt", created_at: dayAgo(4) },
  { id: "b8", matchId: 1008, market: "1X2", selection: "HOME", stake: 20, odds: 1.65, result: "WIN", league: "La Liga", teams: "Real Madrid vs Sevilla", created_at: dayAgo(4) },
  { id: "b9", matchId: 1009, market: "OVER25", selection: "UNDER", stake: 15, odds: 2.1, result: "PUSH", league: "Serie A", teams: "Roma vs Lazio", created_at: dayAgo(5) },
  { id: "b10", matchId: 1010, market: "1X2", selection: "AWAY", stake: 40, odds: 2.85, result: "LOSS", league: "Premier League", teams: "Man Utd vs Chelsea", created_at: dayAgo(5) },
  { id: "b11", matchId: 1011, market: "BTTS", selection: "YES", stake: 22, odds: 1.7, result: "WIN", league: "Ligue 1", teams: "PSG vs Monaco", created_at: dayAgo(6) },
  { id: "b12", matchId: 1012, market: "1X2", selection: "HOME", stake: 18, odds: 2.25, result: "WIN", league: "La Liga", teams: "Atlético vs Valencia", created_at: dayAgo(6) },
  { id: "b13", matchId: 1013, market: "OVER25", selection: "OVER", stake: 28, odds: 1.9, result: "WIN", league: "Bundesliga", teams: "Bayern vs Stuttgart", created_at: dayAgo(7) },
  { id: "b14", matchId: 1014, market: "1X2", selection: "DRAW", stake: 12, odds: 3.6, result: "LOSS", league: "Serie A", teams: "Napoli vs Milan", created_at: dayAgo(7) },
  { id: "b15", matchId: 1015, market: "BTTS", selection: "YES", stake: 35, odds: 1.8, result: "WIN", league: "Premier League", teams: "Liverpool vs City", created_at: dayAgo(8) },
  { id: "b16", matchId: 1016, market: "OVER25", selection: "UNDER", stake: 20, odds: 2.05, result: "WIN", league: "La Liga", teams: "Espanyol vs Getafe", created_at: dayAgo(8) },
  { id: "b17", matchId: 1017, market: "1X2", selection: "HOME", stake: 50, odds: 1.55, result: "WIN", league: "Ligue 1", teams: "PSG vs Lyon", created_at: dayAgo(9) },
  { id: "b18", matchId: 1018, market: "BTTS", selection: "NO", stake: 15, odds: 2.2, result: "LOSS", league: "Bundesliga", teams: "Wolfsburg vs Schalke", created_at: dayAgo(9) },
  { id: "b19", matchId: 1019, market: "1X2", selection: "AWAY", stake: 22, odds: 2.6, result: "WIN", league: "Serie A", teams: "Atalanta vs Fiorentina", created_at: dayAgo(10) },
  { id: "b20", matchId: 1020, market: "OVER25", selection: "OVER", stake: 30, odds: 1.85, result: "LOSS", league: "Premier League", teams: "Newcastle vs Brighton", created_at: dayAgo(10) },
  { id: "b21", matchId: 1021, market: "1X2", selection: "HOME", stake: 25, odds: 2.0, result: "WIN", league: "La Liga", teams: "Sociedad vs Betis", created_at: dayAgo(11) },
  { id: "b22", matchId: 1022, market: "BTTS", selection: "YES", stake: 18, odds: 1.75, result: "WIN", league: "Ligue 1", teams: "Lille vs Nice", created_at: dayAgo(11) },
]
