"use client"

import { useEffect, useState } from "react"
import { type BetSlipItem } from "@/types/bet"
import { loadBetSlip, removeFromBetSlip } from "@/lib/storage/bet-slip"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { Button } from "@/components/primitives/Button"
import { EmptyState } from "@/components/primitives/EmptyState"

interface BetSlipPanelProps {
  open: boolean
  onClose: () => void
}

export function BetSlipPanel({ open, onClose }: BetSlipPanelProps) {
  const [items, setItems] = useState<BetSlipItem[]>([])
  const [stake, setStake] = useState("10")
  const fmt = useFormatOdds()

  useEffect(() => {
    if (open) setItems(loadBetSlip())
  }, [open])

  const totalOdds = items.reduce((acc, i) => acc * i.odds, 1)
  const stakeNum = Number.parseFloat(stake) || 0
  const payout = totalOdds * stakeNum

  return (
    <aside className={`bet-slip ${open ? "bet-slip--open" : ""}`} aria-hidden={!open}>
      <div className="bet-slip-head">
        <strong>Bet Slip ({items.length})</strong>
        <button type="button" className="md-btn md-btn--ghost md-btn--sm" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="bet-slip-body">
        {items.length === 0 ? (
          <EmptyState title="Empty slip" text="Add picks from any match to build your slip." />
        ) : (
          items.map((item) => (
            <div key={`${item.matchId}-${item.market}`} className="bet-slip-row">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{item.match}</strong>
                <button
                  type="button"
                  className="md-btn md-btn--ghost md-btn--sm"
                  onClick={() => setItems(removeFromBetSlip(item.matchId, item.market))}
                >
                  ✕
                </button>
              </div>
              <div className="md-text-muted" style={{ fontSize: 11 }}>
                {item.market} · {item.selection} · @ <span className="md-mono">{fmt(item.odds)}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="bet-slip-foot">
        <div className="md-field" style={{ marginBottom: 12 }}>
          <label className="md-field-label" htmlFor="stake">Stake</label>
          <input
            id="stake"
            type="number"
            min={0}
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="md-input"
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
          <span className="md-text-muted">Total Odds</span>
          <span className="md-mono">{totalOdds.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
          <span className="md-text-muted">Potential Payout</span>
          <span className="md-mono md-text-positive">${payout.toFixed(2)}</span>
        </div>
        <Button variant="primary" block disabled={items.length === 0}>Place Bet</Button>
      </div>
    </aside>
  )
}
