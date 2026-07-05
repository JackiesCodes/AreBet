import { randomUUID } from "node:crypto"
import type { KycProvider, KycSubmissionResult, KycWebhookEvent } from "./types"

/**
 * Auto-approving mock so the KYC flow (submit -> pending -> approved) can
 * be built and tested end-to-end without a real vendor. A real
 * implementation submits documents to the vendor and relies on its
 * asynchronous webhook, never a synchronous auto-approve.
 */
export class MockKycProvider implements KycProvider {
  readonly id = "mock"

  async submitVerification(): Promise<KycSubmissionResult> {
    return { providerReference: `mock_kyc_${randomUUID()}`, status: "pending" }
  }

  verifyWebhook(): boolean {
    // No real signature scheme in mock mode. A real provider's
    // implementation must verify signatureHeader against a shared secret.
    return true
  }

  parseWebhookEvent(rawBody: string): KycWebhookEvent {
    return JSON.parse(rawBody) as KycWebhookEvent
  }
}
