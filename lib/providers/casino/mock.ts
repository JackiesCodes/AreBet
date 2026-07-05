import { randomUUID } from "node:crypto"
import type { CasinoGame, CasinoLaunchSession, CasinoProvider, CasinoRoundResult } from "./types"

const MOCK_GAMES: CasinoGame[] = [
  { id: "mock-coin-flip", label: "Coin Flip (demo)", provider: "mock", thumbnailUrl: "/casino/mock-coin-flip.svg", category: "instant" },
  { id: "mock-dice-roll", label: "Dice Roll (demo)", provider: "mock", thumbnailUrl: "/casino/mock-dice-roll.svg", category: "instant" },
]

/**
 * Placeholder catalogue + launch flow. These are NOT real casino games —
 * they exist only to exercise the session/round/ledger plumbing
 * (debit on bet, credit on win) end-to-end before a real RNG-certified
 * aggregator is integrated. Do not present these as real money games in
 * production copy/marketing.
 */
export class MockCasinoProvider implements CasinoProvider {
  readonly id = "mock"

  async listGames(): Promise<CasinoGame[]> {
    return MOCK_GAMES
  }

  async launchSession(params: {
    userId: string
    gameId: string
    currency: string
    isRealMoney: boolean
  }): Promise<CasinoLaunchSession> {
    const sessionId = randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    return {
      sessionId,
      gameUrl: `/casino/mock-game/${params.gameId}?session=${sessionId}`,
      expiresAt,
    }
  }

  parseRoundCallback(rawBody: string): CasinoRoundResult {
    // No real signature to verify in mock mode — a real provider's
    // implementation must verify signatureHeader against a shared secret
    // before trusting rawBody.
    const payload = JSON.parse(rawBody) as {
      providerRoundId: string
      providerSessionId: string
      betAmount: number
      winAmount: number
    }
    return payload
  }
}
