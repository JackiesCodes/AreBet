export interface DepositResult {
  providerReference: string
  status: "pending" | "completed"
  redirectUrl?: string
}

export interface WithdrawalResult {
  providerReference: string
  status: "pending" | "under_review"
}

export interface PaymentWebhookEvent {
  providerReference: string
  status: "completed" | "failed"
  type: "deposit" | "withdrawal"
}

/**
 * One PaymentProvider per payment rail (Botswana mobile money, cards,
 * etc.) — these are architecturally different enough (redirect flows,
 * callback shapes, destination formats) that a single interface trying to
 * cover all of them would leak rail-specific details into call sites.
 * Real vendors (Orange Money Botswana, MyZaka, a card processor) implement
 * this per rail; the Stripe subscription integration is a separate,
 * unrelated concern and does not implement this interface.
 */
export interface PaymentProvider {
  readonly id: string
  readonly label: string
  readonly supportedCurrencies: readonly string[]
  initiateDeposit(params: {
    userId: string
    amount: number
    currency: string
  }): Promise<DepositResult>
  initiateWithdrawal(params: {
    userId: string
    amount: number
    currency: string
    destination: unknown
  }): Promise<WithdrawalResult>
  verifyWebhook(rawBody: string, signatureHeader: string | null): boolean
  parseWebhookEvent(rawBody: string): PaymentWebhookEvent
}
