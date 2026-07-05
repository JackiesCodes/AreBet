import type { CasinoProvider } from "./types"
import { MockCasinoProvider } from "./mock"

export type { CasinoProvider, CasinoGame, CasinoLaunchSession, CasinoRoundResult } from "./types"

let cachedProvider: CasinoProvider | null = null

/**
 * Resolves the active casino provider. Always mock today — when a real
 * RNG-certified aggregator is integrated, branch here on an env var and
 * return that implementation instead. No call site outside this file
 * should import MockCasinoProvider directly.
 */
export function getCasinoProvider(): CasinoProvider {
  if (!cachedProvider) {
    cachedProvider = new MockCasinoProvider()
  }
  return cachedProvider
}
