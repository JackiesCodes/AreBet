import { confTier } from "@/lib/utils/match-status"
import { cn } from "@/lib/utils/cn"

interface ConfidenceHeatProps {
  value: number
  showLabel?: boolean
  className?: string
}

export function ConfidenceHeat({ value, showLabel = true, className }: ConfidenceHeatProps) {
  const tier = confTier(value)
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("md-row", className)} style={{ gap: 8 }}>
      <div className={cn("conf-heat", `conf-heat--${tier}`)}>
        <div className="conf-heat-fill" style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className={cn("conf-heat-label", `conf-heat--${tier}`)}>{Math.round(pct)}%</span>}
    </div>
  )
}
