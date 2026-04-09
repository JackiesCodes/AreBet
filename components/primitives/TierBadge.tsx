import type { Tier } from "@/types/user"
import { cn } from "@/lib/utils/cn"

interface TierBadgeProps {
  tier: Tier
  className?: string
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return <span className={cn("md-tier", `md-tier--${tier}`, className)}>{tier}</span>
}
