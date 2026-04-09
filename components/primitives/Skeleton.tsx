import { cn } from "@/lib/utils/cn"

type Variant = "cc" | "list" | "grid"

interface SkeletonProps {
  variant?: Variant
  count?: number
  className?: string
}

export function Skeleton({ variant = "list", count = 1, className }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("md-skel", `md-skel--${variant}`, className)} />
      ))}
    </>
  )
}
