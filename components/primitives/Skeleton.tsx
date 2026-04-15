import { cn } from "@/lib/utils/cn"

type Variant = "cc" | "list" | "grid" | "card" | "table"

interface SkeletonProps {
  variant?: Variant
  count?: number
  className?: string
}

export function Skeleton({ variant = "list", count = 1, className }: SkeletonProps) {
  if (variant === "table") {
    return (
      <div className={cn("md-skel-table-wrap", className)}>
        <div className="md-skel md-skel--table-head" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="md-skel md-skel--table-row" />
        ))}
      </div>
    )
  }

  if (variant === "card") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn("md-skel-card", className)}>
            <div className="md-skel md-skel--card-title" />
            <div className="md-skel md-skel--card-line" />
            <div className="md-skel md-skel--card-line md-skel--card-line-short" />
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("md-skel", `md-skel--${variant}`, className)} />
      ))}
    </>
  )
}
