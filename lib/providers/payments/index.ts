import type { PaymentProvider } from "./types"
import { MockPaymentProvider } from "./mock"

export type {
  PaymentProvider,
  DepositResult,
  WithdrawalResult,
  PaymentWebhookEvent,
} from "./types"

/**
 * Registered payment rails. All mock today — real vendors (Orange Money
 * Botswana, MyZaka, a card processor for international reach) get added
 * here as new entries implementing PaymentProvider, with no changes to
 * wallet/deposit/withdrawal call sites. Keep the Stripe subscription
 * integration (app/api/subscription/*) entirely separate from this
 * registry — it's a different product concern (content paywall, not
 * gambling deposits).
 */
const PROVIDERS: readonly PaymentProvider[] = [
  new MockPaymentProvider("mock_orange_money_bw", "Orange Money (Botswana)", ["BWP"]),
  new MockPaymentProvider("mock_myzaka", "MyZaka", ["BWP"]),
  new MockPaymentProvider("mock_card", "Card", ["BWP", "USD", "ZAR", "EUR", "GBP"]),
]

export function getPaymentProvider(providerId: string): PaymentProvider {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Unknown payment provider: ${providerId}`)
  }
  return provider
}

export function listAvailableProviders(currency: string): PaymentProvider[] {
  return PROVIDERS.filter((p) => p.supportedCurrencies.includes(currency))
}
