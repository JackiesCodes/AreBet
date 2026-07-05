import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getOrCreateWallet } from "@/lib/services/wallet"
import { isRealMoneyEnabled } from "@/lib/config/feature-flags"
import { getPaymentProvider, listAvailableProviders } from "@/lib/providers/payments"

export const dynamic = "force-dynamic"

const DEFAULT_CURRENCY = "BWP"
const MAX_DEPOSIT = 10_000

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, providerId } = body as { amount: number; providerId?: string }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid deposit amount" }, { status: 400 })
    }
    if (amount > MAX_DEPOSIT) {
      return NextResponse.json({ error: `Maximum deposit is ${MAX_DEPOSIT.toLocaleString()} ${DEFAULT_CURRENCY}` }, { status: 400 })
    }

    // The server decides real vs sandbox — never trust a client-supplied
    // flag here, since that would let a client "opt into" the real wallet
    // while REAL_MONEY_ENABLED is off.
    const isRealMoney = (await isRealMoneyEnabled("sports")) || (await isRealMoneyEnabled("casino"))

    const available = listAvailableProviders(DEFAULT_CURRENCY)
    const resolvedProviderId = providerId ?? available[0]?.id
    if (!resolvedProviderId || !available.some((p) => p.id === resolvedProviderId)) {
      return NextResponse.json({ error: "No payment provider available for this currency" }, { status: 400 })
    }
    const provider = getPaymentProvider(resolvedProviderId)

    const service = createServiceClient()
    const wallet = await getOrCreateWallet(service, user.id, DEFAULT_CURRENCY, isRealMoney)

    const { data: deposit, error: depositError } = await service
      .from("deposits")
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        amount,
        currency: DEFAULT_CURRENCY,
        provider: resolvedProviderId,
        status: "pending",
      })
      .select("id")
      .single()

    if (depositError || !deposit) {
      console.error("[wallet/deposit] insert error:", depositError)
      return NextResponse.json({ error: "Failed to start deposit" }, { status: 500 })
    }

    const result = await provider.initiateDeposit({ userId: user.id, amount, currency: DEFAULT_CURRENCY })

    if (result.status === "completed") {
      // Mock providers settle synchronously — a real provider would only
      // reach 'completed' via the webhook, never here.
      const { data: creditTxn, error: creditError } = await service.rpc("apply_wallet_transaction", {
        p_wallet_id: wallet.id,
        p_type: "deposit",
        p_amount: amount,
        p_reference_type: "deposit",
        p_reference_id: deposit.id,
      })

      if (creditError) {
        await service.from("deposits").update({ status: "failed" }).eq("id", deposit.id)
        console.error("[wallet/deposit] credit error:", creditError)
        return NextResponse.json({ error: "Deposit failed to complete" }, { status: 500 })
      }

      await service
        .from("deposits")
        .update({
          status: "completed",
          provider_reference: result.providerReference,
          wallet_transaction_id: (creditTxn as { id: string }).id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", deposit.id)

      return NextResponse.json({
        success: true,
        status: "completed",
        newBalance: wallet.cached_balance + amount,
      })
    }

    await service
      .from("deposits")
      .update({ provider_reference: result.providerReference })
      .eq("id", deposit.id)

    return NextResponse.json({
      success: true,
      status: "pending",
      redirectUrl: result.redirectUrl ?? null,
    })
  } catch (err) {
    console.error("[wallet/deposit] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
