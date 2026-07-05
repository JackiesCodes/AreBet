import type { KycProvider } from "./types"
import { MockKycProvider } from "./mock"

export type { KycProvider, KycSubmissionResult, KycWebhookEvent } from "./types"

let cachedProvider: KycProvider | null = null

/**
 * Resolves the active KYC provider. Always mock today — when a real
 * vendor (Smile Identity, Onfido, Veriff, ...) is integrated, branch here
 * on an env var and return that implementation instead. No call site
 * outside this file should import MockKycProvider directly.
 */
export function getKycProvider(): KycProvider {
  if (!cachedProvider) {
    cachedProvider = new MockKycProvider()
  }
  return cachedProvider
}
