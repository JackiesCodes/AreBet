import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getOrCreateWallet } from "@/lib/services/wallet"
import { isRealMoneyEnabled } from "@/lib/config/feature-flags"
import { listAvailableProviders } from "@/lib/providers/payments"

export const dynamic = "force-dynamic"

const DEFAULT_CURRENCY = "BWP"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isRealMoney = (await isRealMoneyEnabled("sports")) || (await isRealMoneyEnabled("casino"))
    const withdrawalsEnabled = await isRealMoneyEnabled("withdrawals")

    const service = createServiceClient()
    const wallet = await getOrCreateWallet(service, user.id, DEFAULT_CURRENCY, isRealMoney)

    const { data: transactions } = await service
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, reference_type, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(25)

    const providers = listAvailableProviders(DEFAULT_CURRENCY).map((p) => ({
      id: p.id,
      label: p.label,
    }))

    return NextResponse.json({
      currency: DEFAULT_CURRENCY,
      isRealMoney,
      withdrawalsEnabled,
      balance: wallet.cached_balance,
      transactions: transactions ?? [],
      providers,
    })
  } catch (err) {
    console.error("[wallet] error:", err)
    return NextResponse.json({ error: "Failed to load wallet" }, { status: 500 })
  }
}
