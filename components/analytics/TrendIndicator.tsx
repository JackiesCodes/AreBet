import { cn } from "@/lib/utils/cn"

interface TrendIndicatorProps {
  value: number
  previous?: number
  suffix?: string
}

export function TrendIndicator({ value, previous = 0, suffix = "" }: TrendIndicatorProps) {
  const delta = value - previous
  const tone = delta > 0 ? "positive" : delta < 0 ? "negative" : "muted"
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "—"
  return (
    <span
      className={cn(
        "md-mono",
        tone === "positive" && "md-text-positive",
        tone === "negative" && "md-text-negative",
        tone === "muted" && "md-text-muted",
      )}
      style={{ fontSize: 12 }}
    >
      {arrow} {Math.abs(delta).toFixed(1)}{suffix}
    </span>
  )
}
