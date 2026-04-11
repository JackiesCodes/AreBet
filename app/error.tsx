"use client"

/**
 * Global error boundary for the root layout.
 * Catches uncaught errors that propagate to the top of the React tree.
 * Shown instead of the page when an unexpected error occurs.
 */

import { useEffect } from "react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console in dev; swap in a real error reporting service (e.g.
    // Sentry) here for production.
    console.error("[AreBet] Unhandled error:", error)
  }, [error])

  return (
    <div className="md-page">
      <div className="md-empty" style={{ minHeight: "60vh" }}>
        <div className="md-empty-icon" style={{ fontSize: 40 }}>⚠</div>
        <div className="md-empty-title">Something went wrong</div>
        <div className="md-empty-text">
          An unexpected error occurred. Try refreshing the page, or come back shortly.
          {error.digest && (
            <span className="error-digest"> Error ID: {error.digest}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
          <button
            type="button"
            className="md-btn md-btn--primary"
            onClick={reset}
          >
            Try again
          </button>
          <a href="/" className="md-btn md-btn--secondary">
            Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
