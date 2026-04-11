"use client"

import { useEffect, useState } from "react"
import { type BetSlipItem } from "@/types/bet"
import { loadBetSlip, removeFromBetSlip, saveBetSlip } from "@/lib/storage/bet-slip"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { useAuth } from "@/lib/auth/context"
import { useBets } from "@/hooks/useBets"
import { Button } from "@/components/primitives/Button"
import { EmptyState } from "@/components/primitives/EmptyState"

interface BetSlipPanelProps {
  open: boolean
  onClose: () => void
}

type SlipState = "idle" | "placing" | "success" | "error"

export function BetSlipPanel({ open, onClose }: BetSlipPanelProps) {
  const { user } = useAuth()
  const { place } = useBets()
  const [items, setItems] = useState<BetSlipItem[]>([])
  const [stake, setStake] = useState("10")
  const [slipState, setSlipState] = useState<SlipState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const fmt = useFormatOdds()

  useEffect(() => {
    if (open) {
      setItems(loadBetSlip())
      setSlipState("idle")
    }
  }, [open])

  const totalOdds = items.reduce((acc, i) => acc * i.odds, 1)
  const stakeNum = Number.parseFloat(stake) || 0
  const payout = totalOdds * stakeNum

  async function handlePlaceBet() {
    if (!user) {
      setErrorMsg("Sign in to track your picks")
      setSlipState("error")
      return
    }
    if (items.length === 0 || stakeNum <= 0) return

    setSlipState("placing")
    try {
      await place(items, stakeNum)
      saveBetSlip([])
      setItems([])
      setSlipState("success")
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to save pick")
      setSlipState("error")
    }
  }

  return (
    <aside className={`bet-slip ${open ? "bet-slip--open" : ""}`} aria-hidden={!open}>
      <div className="bet-slip-head">
        <strong>Pick Slip ({items.length})</strong>
        <button type="button" className="md-btn md-btn--ghost md-btn--sm" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="bet-slip-body">
        {slipState === "success" ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Pick Tracked!</div>
            <div className="md-text-muted" style={{ fontSize: 12 }}>
              Stake ${stakeNum.toFixed(2)} · Potential return ${payout.toFixed(2)}
            </div>
            <button
              type="button"
              className="md-btn md-btn--ghost md-btn--sm"
              style={{ marginTop: 16 }}
              onClick={() => { setSlipState("idle"); onClose() }}
            >
              Close
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No picks yet" text="Add a pick from any match card to start tracking." />
        ) : (
          items.map((item) => (
            <div key={`${item.matchId}-${item.market}`} className="bet-slip-row">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 12 }}>{item.match}</strong>
                <button
                  type="button"
                  className="md-btn md-btn--ghost md-btn--sm"
                  onClick={() => setItems(removeFromBetSlip(item.matchId, item.market))}
                >
                  ✕
                </button>
              </div>
              <div className="md-text-muted" style={{ fontSize: 11 }}>
                {item.market} · {item.selection} · @{" "}
                <span className="md-mono">{fmt(item.odds)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {slipState !== "success" && (
        <div className="bet-slip-foot">
          <div className="md-field" style={{ marginBottom: 12 }}>
            <label className="md-field-label" htmlFor="stake">Your Stake ($)</label>
            <input
              id="stake"
              type="number"
              min={0}
              step={0.5}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="md-input"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span className="md-text-muted">Total Odds</span>
            <span className="md-mono">{totalOdds.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
            <span className="md-text-muted">Potential Payout</span>
            <span className="md-mono md-text-positive">${payout.toFixed(2)}</span>
          </div>
          {slipState === "error" && (
            <div style={{ fontSize: 11, marginBottom: 8, color: "var(--md-negative)" }}>
              {errorMsg || "Something went wrong"}
            </div>
          )}
          {!user && (
            <div style={{ fontSize: 11, marginBottom: 8 }} className="md-text-muted">
              Sign in to save your picks and track performance over time.
            </div>
          )}
          <Button
            variant="primary"
            block
            disabled={items.length === 0 || stakeNum <= 0 || slipState === "placing"}
            onClick={handlePlaceBet}
          >
            {slipState === "placing" ? "Saving..." : user ? "Track Pick" : "Track Pick (Guest)"}
          </Button>
        </div>
      )}
    </aside>
  )
}
