"use client"

import { useState, useEffect } from "react"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { useBets } from "@/hooks/useBets"
import { kellyStake } from "@/lib/utils/value-bet"
import type { ValueEdge } from "@/types/match"

const BANKROLL_KEY = "arebet:bankroll:v1"

function loadBankroll(): number {
  if (typeof window === "undefined") return 1000
  try {
    return parseFloat(localStorage.getItem(BANKROLL_KEY) ?? "1000") || 1000
  } catch {
    return 1000
  }
}

function saveBankroll(value: number) {
  try {
    localStorage.setItem(BANKROLL_KEY, String(value))
  } catch { /* ignore */ }
}

interface BankrollTrackerProps {
  valueEdge?: ValueEdge | null
}

export function BankrollTracker({ valueEdge }: BankrollTrackerProps) {
  const { summary } = useBets()
  const [bankroll, setBankroll] = useState(1000)
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState("")

  useEffect(() => {
    const stored = loadBankroll()
    setBankroll(stored)
    setInput(String(stored))
  }, [])

  function handleSave() {
    const val = parseFloat(input)
    if (!isNaN(val) && val > 0) {
      setBankroll(val)
      saveBankroll(val)
    }
    setEditing(false)
  }

  const currentBankroll = bankroll + summary.profit
  const kellySuggestion = valueEdge ? kellyStake(valueEdge, currentBankroll) : null

  return (
    <Card>
      <CardTitle>Bankroll Tracker</CardTitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <CardSubtitle>Starting Bankroll</CardSubtitle>
          {editing ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="number"
                className="md-input"
                style={{ width: 100, fontSize: 13 }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <button type="button" className="md-btn md-btn--ghost md-btn--sm" onClick={handleSave}>✓</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>${bankroll.toLocaleString()}</span>
              <button
                type="button"
                className="md-btn md-btn--ghost md-btn--sm"
                onClick={() => { setInput(String(bankroll)); setEditing(true) }}
                title="Edit bankroll"
              >
                ✎
              </button>
            </div>
          )}
        </div>

        <div>
          <CardSubtitle>Current Bankroll</CardSubtitle>
          <span style={{
            fontSize: 22,
            fontWeight: 700,
            color: currentBankroll >= bankroll ? "var(--md-positive)" : "var(--md-negative)",
          }}>
            ${currentBankroll.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div>
          <CardSubtitle>Total Staked</CardSubtitle>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            ${summary.totalStaked.toFixed(2)}
          </span>
        </div>

        <div>
          <CardSubtitle>Net P&L</CardSubtitle>
          <span style={{
            fontSize: 18,
            fontWeight: 600,
            color: summary.profit >= 0 ? "var(--md-positive)" : "var(--md-negative)",
          }}>
            {summary.profit >= 0 ? "+$" : "-$"}{Math.abs(summary.profit).toFixed(2)}
          </span>
        </div>
      </div>

      {kellySuggestion != null && kellySuggestion > 0 && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 6, background: "var(--md-surface-2)", fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            ¼ Kelly Stake Suggestion
          </div>
          <div className="md-text-muted">
            Recommended stake on this value bet:{" "}
            <span style={{ fontWeight: 700, color: "var(--md-positive)" }}>
              ${kellySuggestion.toFixed(2)}
            </span>
            {" "}({((kellySuggestion / currentBankroll) * 100).toFixed(1)}% of bankroll)
          </div>
        </div>
      )}
    </Card>
  )
}
