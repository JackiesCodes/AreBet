"use client"

import { useAuth } from "@/lib/auth/context"
import type { Tier } from "@/types/user"

export type Feature =
  | "market-movement"    // Market movement sparkline — pro+
  | "advanced-odds"      // Advanced model breakdown — pro+
  | "push-notifications" // PWA push notifications — pro+
  | "trust-full"         // Full calibration data — pro+

const FEATURE_TIERS: Record<Feature, Tier[]> = {
  "market-movement":    ["pro", "elite"],
  "advanced-odds":      ["pro", "elite"],
  "push-notifications": ["pro", "elite"],
  "trust-full":         ["pro", "elite"],
}

function tierRank(tier: Tier): number {
  return tier === "elite" ? 2 : tier === "pro" ? 1 : 0
}

/**
 * Returns a function to check whether the current user can access a given feature.
 * Falls back to 'free' if user is unauthenticated.
 */
export function useFeatureAccess() {
  const { tier: authTier } = useAuth()
  const tier: Tier = authTier ?? "free"

  const canAccess = (feature: Feature): boolean => {
    const allowedTiers = FEATURE_TIERS[feature]
    return allowedTiers.some((t) => tierRank(tier) >= tierRank(t))
  }

  return { canAccess, tier }
}
