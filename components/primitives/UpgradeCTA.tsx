import Link from "next/link"
import { TierBadge } from "./TierBadge"

interface UpgradeCTAProps {
  /** Feature name to show in the message */
  featureName?: string
  /** Minimum tier required */
  requiredTier?: "pro" | "elite"
}

export function UpgradeCTA({ featureName, requiredTier = "pro" }: UpgradeCTAProps) {
  return (
    <div className="upgrade-cta">
      <TierBadge tier={requiredTier} />
      <p className="upgrade-cta-text">
        {featureName ? `${featureName} requires` : "This feature requires"} a{" "}
        <strong>{requiredTier}</strong> subscription.
      </p>
      <Link href="/subscription" className="md-btn md-btn--primary md-btn--sm">
        Upgrade
      </Link>
    </div>
  )
}
