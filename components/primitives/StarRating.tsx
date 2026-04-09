"use client"

import { cn } from "@/lib/utils/cn"

interface StarRatingProps {
  value: number // 0..5
  max?: number
  onChange?: (value: number) => void
  readOnly?: boolean
}

export function StarRating({ value, max = 5, onChange, readOnly = false }: StarRatingProps) {
  return (
    <div className="md-stars">
      {Array.from({ length: max }).map((_, i) => {
        const idx = i + 1
        const filled = idx <= Math.round(value)
        return (
          <span
            key={i}
            role={readOnly ? undefined : "button"}
            tabIndex={readOnly ? undefined : 0}
            aria-label={`${idx} stars`}
            className={cn("md-star", filled && "md-star--filled", !readOnly && "md-star-btn")}
            onClick={() => !readOnly && onChange?.(idx)}
          >
            ★
          </span>
        )
      })}
    </div>
  )
}
