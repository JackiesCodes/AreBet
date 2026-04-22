"use client"

import { useEffect } from "react"
import Link from "next/link"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MatchDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[MatchDetailPage] Error:", error)
  }, [error])

  return (
    <div style={{ padding: "var(--space-8)", textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Could not load match details</h2>
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
        The match data couldn&apos;t be fetched. This may be a temporary API issue.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={reset}
          style={{ padding: "8px 16px", background: "var(--accent)", color: "#fff", borderRadius: 8, fontSize: 14, border: "none", cursor: "pointer" }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{ padding: "8px 16px", background: "var(--surface-2)", color: "var(--text-primary)", borderRadius: 8, fontSize: 14, textDecoration: "none" }}
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
