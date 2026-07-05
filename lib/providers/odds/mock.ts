import { hashString, seededRandom } from "@/lib/utils/seeded-random"
import type { OddsMarketCode, OddsMarketQuote, OddsProvider } from "./types"

const BOOKMAKER_MARGIN = 1.06 // ~6% overround, typical of a real sportsbook

function toOdds(probability: number): number {
  const withMargin = probability * BOOKMAKER_MARGIN
  return Math.round((1 / withMargin) * 100) / 100
}

function buildQuotes(fixtureId: number): OddsMarketQuote[] {
  const rng = seededRandom(hashString(`odds:${fixtureId}`))
  const quotes: OddsMarketQuote[] = []

  // MATCH_WINNER — three-way, probabilities normalized to sum to 1
  const rawHome = 0.2 + rng() * 0.6
  const rawDraw = 0.15 + rng() * 0.2
  const rawAway = 0.2 + rng() * 0.6
  const total = rawHome + rawDraw + rawAway
  quotes.push(
    { marketCode: "MATCH_WINNER", marketLabel: "Match Winner", selectionCode: "HOME", selectionLabel: "Home", odds: toOdds(rawHome / total), providerQuoteId: `mock:${fixtureId}:MATCH_WINNER:HOME` },
    { marketCode: "MATCH_WINNER", marketLabel: "Match Winner", selectionCode: "DRAW", selectionLabel: "Draw", odds: toOdds(rawDraw / total), providerQuoteId: `mock:${fixtureId}:MATCH_WINNER:DRAW` },
    { marketCode: "MATCH_WINNER", marketLabel: "Match Winner", selectionCode: "AWAY", selectionLabel: "Away", odds: toOdds(rawAway / total), providerQuoteId: `mock:${fixtureId}:MATCH_WINNER:AWAY` },
  )

  // BTTS — two-way
  const bttsYes = 0.35 + rng() * 0.3
  quotes.push(
    { marketCode: "BTTS", marketLabel: "Both Teams to Score", selectionCode: "YES", selectionLabel: "Yes", odds: toOdds(bttsYes), providerQuoteId: `mock:${fixtureId}:BTTS:YES` },
    { marketCode: "BTTS", marketLabel: "Both Teams to Score", selectionCode: "NO", selectionLabel: "No", odds: toOdds(1 - bttsYes), providerQuoteId: `mock:${fixtureId}:BTTS:NO` },
  )

  // OVER_25 / UNDER_25 — modeled as two separate single-selection markets,
  // matching the existing BetMarket union in contexts/BetSlipContext.tsx
  const over25 = 0.4 + rng() * 0.3
  quotes.push(
    { marketCode: "OVER_25", marketLabel: "Over 2.5 Goals", selectionCode: "OVER", selectionLabel: "Over 2.5", odds: toOdds(over25), providerQuoteId: `mock:${fixtureId}:OVER_25:OVER` },
    { marketCode: "UNDER_25", marketLabel: "Under 2.5 Goals", selectionCode: "UNDER", selectionLabel: "Under 2.5", odds: toOdds(1 - over25), providerQuoteId: `mock:${fixtureId}:UNDER_25:UNDER` },
  )

  // DOUBLE_CHANCE — three-way, derived from the match-winner probabilities
  quotes.push(
    { marketCode: "DOUBLE_CHANCE", marketLabel: "Double Chance", selectionCode: "HOME_OR_DRAW", selectionLabel: "Home or Draw", odds: toOdds((rawHome + rawDraw) / total), providerQuoteId: `mock:${fixtureId}:DOUBLE_CHANCE:HOME_OR_DRAW` },
    { marketCode: "DOUBLE_CHANCE", marketLabel: "Double Chance", selectionCode: "HOME_OR_AWAY", selectionLabel: "Home or Away", odds: toOdds((rawHome + rawAway) / total), providerQuoteId: `mock:${fixtureId}:DOUBLE_CHANCE:HOME_OR_AWAY` },
    { marketCode: "DOUBLE_CHANCE", marketLabel: "Double Chance", selectionCode: "DRAW_OR_AWAY", selectionLabel: "Draw or Away", odds: toOdds((rawDraw + rawAway) / total), providerQuoteId: `mock:${fixtureId}:DOUBLE_CHANCE:DRAW_OR_AWAY` },
  )

  return quotes
}

/**
 * Deterministic placeholder odds, seeded per fixture so repeated calls
 * within the same match stay stable. Not a real trading/risk engine —
 * just internally consistent enough (implied probabilities sum to a
 * plausible bookmaker overround) to exercise the UI, bet placement, and
 * settlement math end-to-end.
 */
export class MockOddsProvider implements OddsProvider {
  readonly id = "mock"

  async getOddsForFixture(fixtureId: number): Promise<OddsMarketQuote[]> {
    return buildQuotes(fixtureId)
  }

  async getQuote(
    fixtureId: number,
    marketCode: OddsMarketCode,
    selectionCode: string
  ): Promise<OddsMarketQuote | null> {
    const quotes = buildQuotes(fixtureId)
    return (
      quotes.find(
        (q) => q.marketCode === marketCode && q.selectionCode === selectionCode
      ) ?? null
    )
  }
}
