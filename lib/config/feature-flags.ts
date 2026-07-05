/**
 * Real-money feature gating — two deliberately redundant layers.
 *
 * 1. REAL_MONEY_ENABLED (env var, deploy-time): the master kill switch.
 *    If it isn't exactly "true", every feature below is off regardless of
 *    what's stored in the `feature_flags` table. Changing it requires a
 *    Vercel env var change + redeploy — it is intentionally not exposed
 *    anywhere in the app UI. Do not flip this on without the user
 *    confirming in writing that a gambling license has been granted for
 *    every jurisdiction being served.
 *
 * 2. The `feature_flags` DB table (runtime, admin-controlled): allows
 *    granular rollout once the master switch is on — e.g. enabling
 *    real-money sports before real-money casino, or deposits before
 *    withdrawal processing is finished.
 *
 * Every money-moving route (bet placement, deposits, withdrawals, casino
 * rounds) must call isRealMoneyEnabled() before choosing which wallet
 * (`wallets.is_real_money`) and which provider (mock vs real) to use.
 * When false, the sandbox wallet and mock providers are used regardless
 * of the DB-level flag value.
 */

import { createServiceClient } from "@/lib/supabase/service"

export type RealMoneyFeature = "sports" | "casino" | "withdrawals"

const FLAG_KEY: Record<RealMoneyFeature, string> = {
  sports: "real_money_sports",
  casino: "real_money_casino",
  withdrawals: "withdrawals_enabled",
}

const CACHE_TTL_MS = 30_000

let cache: { flags: Record<string, boolean>; expiresAt: number } | null = null

async function getFeatureFlags(): Promise<Record<string, boolean>> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.flags
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.from("feature_flags").select("key, enabled")

  if (error) {
    // Fail closed: if flags can't be read, treat every feature as disabled
    // rather than risk defaulting real-money features on.
    console.error("[feature-flags] failed to load feature_flags:", error)
    return {}
  }

  const flags: Record<string, boolean> = {}
  for (const row of data ?? []) {
    flags[row.key as string] = Boolean(row.enabled)
  }

  cache = { flags, expiresAt: Date.now() + CACHE_TTL_MS }
  return flags
}

/**
 * Master kill switch check only — does not consult the DB. Use this where
 * you need to know "is real money possible at all right now" without a
 * DB round trip (e.g. deciding whether to even show a currency selector).
 */
export function isRealMoneyMasterEnabled(): boolean {
  return process.env.REAL_MONEY_ENABLED === "true"
}

/**
 * Full gate check for a specific feature: master switch AND the
 * corresponding DB-level flag must both be on.
 */
export async function isRealMoneyEnabled(feature: RealMoneyFeature): Promise<boolean> {
  if (!isRealMoneyMasterEnabled()) return false
  const flags = await getFeatureFlags()
  return flags[FLAG_KEY[feature]] ?? false
}
