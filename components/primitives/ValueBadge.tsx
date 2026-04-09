"use client"

import type { ValueEdge } from "@/types/match"

interface ValueBadgeProps {
  edge: ValueEdge
  showEdge?: boolean
}

export function ValueBadge({ edge, showEdge = true }: ValueBadgeProps) {
  if (!edge.isValue) return null

  const selectionLabel =
    edge.selection === "home" ? "1" : edge.selection === "draw" ? "X" : "2"
  const edgePct = (edge.edge * 100).toFixed(1)

  return (
    <span className="value-badge" title={`Model: ${(edge.modelProb * 100).toFixed(1)}% | Market: ${(edge.impliedProb * 100).toFixed(1)}% | Edge: +${edgePct}%`}>
      <span className="value-badge__icon">▲</span>
      <span className="value-badge__text">VALUE {selectionLabel}</span>
      {showEdge && <span className="value-badge__edge">+{edgePct}%</span>}
    </span>
  )
}
