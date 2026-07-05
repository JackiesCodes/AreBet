export interface KycSubmissionResult {
  providerReference: string
  status: "pending"
}

export interface KycWebhookEvent {
  providerReference: string
  status: "approved" | "rejected"
  reason?: string
}

/**
 * KYC/identity verification adapter boundary. Real candidates (Smile
 * Identity, Onfido, Veriff) are not decided yet — this interface lets the
 * signup/account-verification flow be built now against a mock that
 * auto-approves, with a real vendor dropping in later behind the same
 * interface.
 */
export interface KycProvider {
  readonly id: string
  submitVerification(params: {
    userId: string
    fullName: string
    dateOfBirth: string
    documentType: string
    documentImage: unknown
  }): Promise<KycSubmissionResult>
  verifyWebhook(rawBody: string, signatureHeader: string | null): boolean
  parseWebhookEvent(rawBody: string): KycWebhookEvent
}
