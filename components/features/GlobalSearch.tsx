"use client"

import { useEffect, useState } from "react"

interface GlobalSearchProps {
  onClose: () => void
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="md-modal-backdrop" onClick={onClose}>
      <div className="md-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="md-modal-title">Search</h3>
        <input
          autoFocus
          type="search"
          className="md-input"
          placeholder="Teams, leagues, players…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="md-modal-text" style={{ marginTop: 12 }}>
          {query ? `No results for "${query}". Try a different term.` : "Start typing to search."}
        </p>
      </div>
    </div>
  )
}
