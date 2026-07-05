import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getOrCreateWallet } from "@/lib/services/wallet"
import { isRealMoneyEnabled } from "@/lib/config/feature-flags"
import { getPaymentProvider, listAvailableProviders } from "@/lib/providers/payments"

export const dynamic = "force-dynamic"

const DEFAULT_CURRENCY = "BWP"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const withdrawalsEnabled = await isRealMoneyEnabled("withdrawals")
    if (!withdrawalsEnabled) {
      return NextResponse.json({ error: "Withdrawals are currently unavailable." }, { status: 403 })
    }

    const isRealMoney = (await isRealMoneyEnabled("sports")) || (await isRealMoneyEnabled("casino"))
    if (!isRealMoney) {
      // withdrawals_enabled being true with no real-money product line on
      // is an inconsistent flag state — fail closed rather than let a
      // sandbox balance be "withdrawn".
      return NextResponse.json({ error: "Withdrawals are currently unavailable." }, { status: 403 })
    }

    const body = await request.json()
    const { amount, providerId, destination } = body as {
      amount: number
      providerId?: string
      destination?: unknown
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid withdrawal amount" }, { status: 400 })
    }

    const available = listAvailableProviders(DEFAULT_CURRENCY)
    const resolvedProviderId = providerId ?? available[0]?.id
    if (!resolvedProviderId || !available.some((p) => p.id === resolvedProviderId)) {
      return NextResponse.json({ error: "No payment provider available for this currency" }, { status: 400 })
    }
    const provider = getPaymentProvider(resolvedProviderId)

    const service = createServiceClient()
    const wallet = await getOrCreateWallet(service, user.id, DEFAULT_CURRENCY, isRealMoney)

    if (wallet.cached_balance < amount) {
      return NextResponse.json(
        { error: `Insufficient funds. Your balance is ${wallet.cached_balance.toFixed(2)} ${DEFAULT_CURRENCY}.` },
        { status: 400 }
      )
    }

    const { data: withdrawal, error: withdrawalError } = await service
      .from("withdrawals")
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        amount,
        currency: DEFAULT_CURRENCY,
        provider: resolvedProviderId,
        destination: destination ?? null,
        status: "pending",
      })
      .select("id")
      .single()

    if (withdrawalError || !withdrawal) {
      console.error("[wallet/withdraw] insert error:", withdrawalError)
      return NextResponse.json({ error: "Failed to start withdrawal" }, { status: 500 })
    }

    // Hold the funds immediately so they can't be double-spent while the
    // withdrawal is pending/under review.
    const { data: debitTxn, error: debitError } = await service.rpc("apply_wallet_transaction", {
      p_wallet_id: wallet.id,
      p_type: "withdrawal",
      p_amount: -amount,
      p_reference_type: "withdrawal",
      p_reference_id: withdrawal.id,
    })

    if (debitError) {
      await service.from("withdrawals").update({ status: "cancelled" }).eq("id", withdrawal.id)
      const message = debitError.message?.includes("Insufficient balance")
        ? "Insufficient funds."
        : "Failed to hold funds for withdrawal."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const result = await provider.initiateWithdrawal({
      userId: user.id,
      amount,
      currency: DEFAULT_CURRENCY,
      destination,
    })

    await service
      .from("withdrawals")
      .update({
        status: result.status,
        provider_reference: result.providerReference,
        wallet_transaction_id: (debitTxn as { id: string }).id,
      })
      .eq("id", withdrawal.id)

    return NextResponse.json({ success: true, status: result.status })
  } catch (err) {
    console.error("[wallet/withdraw] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
