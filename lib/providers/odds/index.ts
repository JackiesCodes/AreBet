import type { OddsProvider } from "./types"
import { MockOddsProvider } from "./mock"

export type { OddsProvider, OddsMarketCode, OddsMarketQuote } from "./types"

let cachedProvider: OddsProvider | null = null

/**
 * Resolves the active odds provider. Always mock today — when a real
 * vendor (Altenar/BtoBet/Digitain/...) is integrated, branch here on an
 * env var and return that implementation instead. No call site outside
 * this file should import MockOddsProvider directly.
 */
export function getOddsProvider(): OddsProvider {
  if (!cachedProvider) {
    cachedProvider = new MockOddsProvider()
  }
  return cachedProvider
}
