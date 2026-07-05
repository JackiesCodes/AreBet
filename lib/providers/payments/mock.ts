import { randomUUID } from "node:crypto"
import type {
  DepositResult,
  PaymentProvider,
  PaymentWebhookEvent,
  WithdrawalResult,
} from "./types"

/**
 * A single mock implementation reused across provider ids (see index.ts),
 * distinguished only by id/label/currencies. Deposits complete
 * immediately; withdrawals go to 'under_review' so both the happy path
 * and the manual-review path can be exercised in sandbox mode before any
 * real payment rail is wired in.
 */
export class MockPaymentProvider implements PaymentProvider {
  constructor(
    readonly id: string,
    readonly label: string,
    readonly supportedCurrencies: readonly string[]
  ) {}

  async initiateDeposit(): Promise<DepositResult> {
    return { providerReference: `mock_dep_${randomUUID()}`, status: "completed" }
  }

  async initiateWithdrawal(): Promise<WithdrawalResult> {
    return { providerReference: `mock_wd_${randomUUID()}`, status: "under_review" }
  }

  verifyWebhook(): boolean {
    // No real signature scheme in mock mode. A real provider's
    // implementation must verify signatureHeader against a shared secret.
    return true
  }

  parseWebhookEvent(rawBody: string): PaymentWebhookEvent {
    return JSON.parse(rawBody) as PaymentWebhookEvent
  }
}
