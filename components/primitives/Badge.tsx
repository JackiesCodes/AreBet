import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

export type BadgeTone =
  | "live"
  | "ht"
  | "upcoming"
  | "finished"
  | "neutral"
  | "positive"
  | "negative"

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return <span className={cn("md-badge", `md-badge--${tone}`, className)}>{children}</span>
}
