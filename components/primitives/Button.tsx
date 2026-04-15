import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = "secondary",
  size = "md",
  block,
  loading,
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
        loading && "md-btn--loading",
        className,
      )}
      disabled={loading || rest.disabled}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden />}
      {children}
    </button>
  )
}
