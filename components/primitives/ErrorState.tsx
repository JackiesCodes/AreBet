import type { ReactNode } from "react"

interface ErrorStateProps {
  title?: string
  text?: string
  action?: ReactNode
}

export function ErrorState({ title = "Something went wrong", text, action }: ErrorStateProps) {
  return (
    <div className="md-error">
      <div className="md-error-icon">!</div>
      <div className="md-error-title">{title}</div>
      {text && <div className="md-error-text">{text}</div>}
      {action}
    </div>
  )
}
