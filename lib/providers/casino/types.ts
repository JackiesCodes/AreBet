export interface CasinoGame {
  id: string
  label: string
  provider: string
  thumbnailUrl: string
  category: "slots" | "table" | "live" | "instant"
}

export interface CasinoLaunchSession {
  sessionId: string
  gameUrl: string // in a real aggregator this is an iframe/embed URL
  expiresAt: string // ISO timestamp
}

export interface CasinoRoundResult {
  providerRoundId: string
  providerSessionId: string
  betAmount: number
  winAmount: number
}

/**
 * Casino provider adapter boundary. Real slot/table RNG logic is
 * explicitly out of scope for this app — that must come from an
 * RNG-certified aggregator (e.g. Pragmatic Play, EGT, Betsoft) via
 * hosted game embeds and server-to-server round callbacks. This app only
 * ever records the resulting debit/credit against the wallet ledger.
 */
export interface CasinoProvider {
  readonly id: string
  listGames(): Promise<CasinoGame[]>
  launchSession(params: {
    userId: string
    gameId: string
    currency: string
    isRealMoney: boolean
  }): Promise<CasinoLaunchSession>
  /** Verifies and parses a provider's server-to-server round callback. */
  parseRoundCallback(rawBody: string, signatureHeader: string | null): CasinoRoundResult
}
