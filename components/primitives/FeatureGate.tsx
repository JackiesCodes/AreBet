"use client"

import type { ReactNode } from "react"
import { useFeatureAccess, type Feature } from "@/hooks/useFeatureAccess"
import { UpgradeCTA } from "./UpgradeCTA"

interface FeatureGateProps {
  feature: Feature
  children: ReactNode
  /** Custom fallback — defaults to UpgradeCTA */
  fallback?: ReactNode
  featureName?: string
}

/**
 * Conditionally renders children if the current user has access to the feature.
 * Shows UpgradeCTA (or a custom fallback) for lower tiers.
 *
 * @example
 * <FeatureGate feature="market-movement" featureName="Market movement">
 *   <MarketMovementChart />
 * </FeatureGate>
 */
export function FeatureGate({ feature, children, fallback, featureName }: FeatureGateProps) {
  const { canAccess } = useFeatureAccess()
  if (canAccess(feature)) return <>{children}</>
  return <>{fallback ?? <UpgradeCTA featureName={featureName} />}</>
}
