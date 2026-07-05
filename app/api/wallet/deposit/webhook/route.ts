import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getPaymentProvider } from "@/lib/providers/payments"

export const dynamic = "force-dynamic"

/**
 * Server-to-server callback for payment providers that settle deposits
 * asynchronously (mock providers never call this — they complete
 * synchronously in app/api/wallet/deposit). A real provider posts here
 * with ?provider=<id> once the deposit clears or fails.
 */
export async function POST(request: Request) {
  const providerId = new URL(request.url).searchParams.get("provider")
  if (!providerId) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 })
  }

  let provider
  try {
    provider = getPaymentProvider(providerId)
  } catch {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-webhook-signature")

  if (!provider.verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = provider.parseWebhookEvent(rawBody)
  if (event.type !== "deposit") {
    return NextResponse.json({ error: "Not a deposit event" }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: deposit, error: fetchError } = await service
    .from("deposits")
    .select("id, wallet_id, amount, status")
    .eq("provider", providerId)
    .eq("provider_reference", event.providerReference)
    .single()

  if (fetchError || !deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 })
  }

  // Idempotency: a duplicate webhook delivery for an already-settled
  // deposit is a no-op, not an error.
  if (deposit.status !== "pending") {
    return NextResponse.json({ ok: true, alreadyProcessed: true })
  }

  if (event.status === "failed") {
    await service.from("deposits").update({ status: "failed" }).eq("id", deposit.id)
    return NextResponse.json({ ok: true })
  }

  const { data: creditTxn, error: creditError } = await service.rpc("apply_wallet_transaction", {
    p_wallet_id: deposit.wallet_id,
    p_type: "deposit",
    p_amount: deposit.amount,
    p_reference_type: "deposit",
    p_reference_id: deposit.id,
  })

  if (creditError) {
    console.error("[wallet/deposit/webhook] credit error:", creditError)
    return NextResponse.json({ error: "Failed to apply deposit" }, { status: 500 })
  }

  await service
    .from("deposits")
    .update({
      status: "completed",
      wallet_transaction_id: (creditTxn as { id: string }).id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", deposit.id)

  return NextResponse.json({ ok: true })
}
