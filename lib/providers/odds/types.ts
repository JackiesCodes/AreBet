export type OddsMarketCode =
  | "MATCH_WINNER"
  | "BTTS"
  | "OVER_25"
  | "UNDER_25"
  | "DOUBLE_CHANCE"

export interface OddsMarketQuote {
  marketCode: OddsMarketCode
  marketLabel: string
  selectionCode: string // 'HOME' | 'DRAW' | 'AWAY' | 'YES' | 'NO' | 'OVER' | 'UNDER' | ...
  selectionLabel: string
  odds: number
  providerQuoteId: string
}

/**
 * Odds provider adapter boundary. Real odds-compiling/trading logic is
 * explicitly out of scope for this app — a real implementation of this
 * interface calls out to a licensed odds/risk vendor (e.g. Altenar,
 * BtoBet, Digitain). Call sites (bet placement, odds display) depend only
 * on this interface, never on a concrete provider.
 */
export interface OddsProvider {
  readonly id: string
  getOddsForFixture(fixtureId: number): Promise<OddsMarketQuote[]>
  getQuote(
    fixtureId: number,
    marketCode: OddsMarketCode,
    selectionCode: string
  ): Promise<OddsMarketQuote | null>
}
