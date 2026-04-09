import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  children: ReactNode
}

export function Button({
  variant = "secondary",
  size = "md",
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "md-btn",
        `md-btn--${variant}`,
        size === "sm" && "md-btn--sm",
        size === "lg" && "md-btn--lg",
        block && "md-btn--block",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
