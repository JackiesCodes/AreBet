import type { SupabaseClient } from "@supabase/supabase-js"

export interface WalletRow {
  id: string
  cached_balance: number
}

/**
 * Fetch a user's wallet for (currency, is_real_money), creating it with a
 * zero balance if it doesn't exist yet. Wallets aren't auto-created at
 * signup (unlike profiles) since currency/real-money combinations are
 * opened lazily on first use.
 */
export async function getOrCreateWallet(
  supabase: SupabaseClient,
  userId: string,
  currency: string,
  isRealMoney: boolean
): Promise<WalletRow> {
  const { data: existing } = await supabase
    .from("wallets")
    .select("id, cached_balance")
    .eq("user_id", userId)
    .eq("currency", currency)
    .eq("is_real_money", isRealMoney)
    .maybeSingle()

  if (existing) return existing as WalletRow

  const { data: created, error } = await supabase
    .from("wallets")
    .insert({ user_id: userId, currency, is_real_money: isRealMoney })
    .select("id, cached_balance")
    .single()

  if (error) {
    // Concurrent request may have created the wallet first (unique
    // constraint on user_id/currency/is_real_money) — re-fetch rather
    // than fail.
    if (error.code === "23505") {
      const { data: retried, error: retryError } = await supabase
        .from("wallets")
        .select("id, cached_balance")
        .eq("user_id", userId)
        .eq("currency", currency)
        .eq("is_real_money", isRealMoney)
        .single()
      if (!retryError && retried) return retried as WalletRow
    }
    throw error
  }

  return created as WalletRow
}
