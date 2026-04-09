import type { ReactNode } from "react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  text?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="md-empty">
      <div className="md-empty-icon">{icon ?? "·"}</div>
      <div className="md-empty-title">{title}</div>
      {text && <div className="md-empty-text">{text}</div>}
      {action}
    </div>
  )
}
