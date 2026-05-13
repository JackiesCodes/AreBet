"use client"

import type { Match } from "@/types/match"

export function MatchTimelineTab({ match }: { match: Match }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {match.events.length === 0 && <p className="md-text-muted">No events yet.</p>}
      {match.events.map((ev, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "40px 24px 1fr",
            gap: 8,
            padding: 8,
            background: "var(--surface-2)",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <span className="md-mono md-text-muted">{ev.minute}&apos;</span>
          <span>
            {ev.type === "goal" ? "⚽" : ev.type === "card" ? "🟨" : ev.type === "sub" ? "🔄" : "↔"}
          </span>
          <span>
            <strong>{ev.player || "Unknown"}</strong>
            {" · "}
            <span className="md-text-muted">{ev.detail}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
