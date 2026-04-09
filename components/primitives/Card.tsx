import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

interface CardProps {
  children: ReactNode
  elevated?: boolean
  className?: string
}

export function Card({ children, elevated, className }: CardProps) {
  return <div className={cn("md-card", elevated && "md-card--elevated", className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("md-card-title", className)}>{children}</h3>
}

export function CardSubtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("md-card-subtitle", className)}>{children}</p>
}
