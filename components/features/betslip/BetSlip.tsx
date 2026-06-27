"use client"

import { useState } from "react"
import { useBetSlip } from "@/contexts/BetSlipContext"
import { useAuth } from "@/lib/auth/context"
import { cn } from "@/lib/utils/cn"

type BetType = "SINGLES" | "ACCUMULATOR"

export function BetSlip() {
  const {
    selections,
    removeBet,
    updateStake,
    clearSlip,
    totalStake,
    totalOdds,
    potentialReturn,
    betCount,
    isOpen,
    setIsOpen,
  } = useBetSlip()
  const { user } = useAuth()
  const [betType, setBetType] = useState<BetType>("SINGLES")
  const [accumStake, setAccumStake] = useState(10)
  const [placing, setPlacing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handlePlace() {
    if (!user) {
      setMessage({ type: "error", text: "Please sign in to place bets." })
      return
    }
    if (selections.length === 0) return

    setPlacing(true)
    setMessage(null)

    try {
      const betsPayload = betType === "ACCUMULATOR"
        ? selections.map((s) => ({ ...s, stake: accumStake / selections.length }))
        : selections

      const res = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bets: betsPayload,
          betType: betType === "ACCUMULATOR" ? "ACCUMULATOR" : "SINGLE",
          accumStake: betType === "ACCUMULATOR" ? accumStake : undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Failed to place bet." })
      } else {
        setMessage({ type: "success", text: `Bet placed! Potential return: $${(betType === "ACCUMULATOR" ? accumStake * totalOdds : potentialReturn).toFixed(2)}` })
        clearSlip()
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setPlacing(false)
    }
  }

  const accaPotentialReturn = accumStake * totalOdds

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        className={cn("bet-slip-fab", isOpen && "bet-slip-fab--open")}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Bet slip${betCount > 0 ? `, ${betCount} selection${betCount !== 1 ? "s" : ""}` : ""}`}
        aria-expanded={isOpen}
        aria-controls="bet-slip-panel"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
        <span className="bet-slip-fab-label">Bet Slip</span>
        {betCount > 0 && (
          <span className="bet-slip-fab-badge" aria-label={`${betCount} selections`}>
            {betCount}
          </span>
        )}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="bet-slip-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* Panel */}
      <div
        id="bet-slip-panel"
        className={cn("bet-slip-panel", isOpen && "bet-slip-panel--open")}
        aria-label="Bet slip"
        role="region"
      >
        {/* Header */}
        <div className="bet-slip-header">
          <span className="bet-slip-title">
            Bet Slip
            {betCount > 0 && <span className="bet-slip-count">{betCount}</span>}
          </span>
          <div className="bet-slip-header-actions">
            {betCount > 0 && (
              <button
                type="button"
                className="bet-slip-clear-btn"
                onClick={clearSlip}
                aria-label="Clear all selections"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              className="bet-slip-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close bet slip"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        {betCount > 0 && (
          <div className="bet-slip-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={betType === "SINGLES"}
              className={cn("bet-slip-tab", betType === "SINGLES" && "bet-slip-tab--active")}
              onClick={() => setBetType("SINGLES")}
            >
              Singles
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={betType === "ACCUMULATOR"}
              className={cn("bet-slip-tab", betType === "ACCUMULATOR" && "bet-slip-tab--active")}
              onClick={() => setBetType("ACCUMULATOR")}
            >
              Accumulator
            </button>
          </div>
        )}

        {/* Body */}
        <div className="bet-slip-body">
          {betCount === 0 ? (
            <div className="bet-slip-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" aria-hidden>
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
              <p>Your bet slip is empty</p>
              <p className="bet-slip-empty-hint">Click on odds to add selections</p>
            </div>
          ) : betType === "SINGLES" ? (
            <div className="bet-items">
              {selections.map((item) => (
                <div key={item.id} className="bet-item">
                  <div className="bet-item-header">
                    <div className="bet-item-info">
                      <span className="bet-item-match">{item.matchLabel}</span>
                      <span className="bet-item-market">{item.marketLabel} — {item.selectionLabel}</span>
                      <span className="bet-item-league">{item.league}</span>
                    </div>
                    <button
                      type="button"
                      className="bet-item-remove"
                      onClick={() => removeBet(item.id)}
                      aria-label={`Remove ${item.matchLabel} from bet slip`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="bet-item-footer">
                    <div className="bet-item-odds-display">
                      <span className="bet-item-odds-label">Odds</span>
                      <span className="bet-item-odds-value">{item.odds.toFixed(2)}</span>
                    </div>
                    <div className="bet-item-stake-wrap">
                      <label className="bet-item-stake-label" htmlFor={`stake-${item.id}`}>Stake $</label>
                      <input
                        id={`stake-${item.id}`}
                        type="number"
                        min="0.50"
                        step="0.50"
                        value={item.stake}
                        onChange={(e) => updateStake(item.id, parseFloat(e.target.value) || 0)}
                        className="bet-item-stake"
                        aria-label={`Stake for ${item.matchLabel}`}
                      />
                    </div>
                    <div className="bet-item-return">
                      <span className="bet-item-return-label">Returns</span>
                      <span className="bet-item-return-value">${(item.stake * item.odds).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bet-items">
              {selections.map((item) => (
                <div key={item.id} className="bet-item bet-item--acca">
                  <div className="bet-item-header">
                    <div className="bet-item-info">
                      <span className="bet-item-match">{item.matchLabel}</span>
                      <span className="bet-item-market">{item.selectionLabel}</span>
                    </div>
                    <span className="bet-item-odds-badge">{item.odds.toFixed(2)}</span>
                    <button
                      type="button"
                      className="bet-item-remove"
                      onClick={() => removeBet(item.id)}
                      aria-label={`Remove ${item.matchLabel}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              <div className="bet-acca-stake-row">
                <label className="bet-item-stake-label" htmlFor="acca-stake">Total Stake $</label>
                <input
                  id="acca-stake"
                  type="number"
                  min="0.50"
                  step="0.50"
                  value={accumStake}
                  onChange={(e) => setAccumStake(parseFloat(e.target.value) || 0)}
                  className="bet-item-stake bet-item-stake--acca"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {betCount > 0 && (
          <div className="bet-slip-footer">
            {message && (
              <div className={cn("bet-slip-message", `bet-slip-message--${message.type}`)}>
                {message.text}
              </div>
            )}

            <div className="bet-slip-summary">
              <div className="bet-slip-summary-row">
                <span>Total Stake</span>
                <span>${betType === "ACCUMULATOR" ? accumStake.toFixed(2) : totalStake.toFixed(2)}</span>
              </div>
              {betType === "ACCUMULATOR" && (
                <div className="bet-slip-summary-row">
                  <span>Combined Odds</span>
                  <span>{totalOdds.toFixed(2)}</span>
                </div>
              )}
              <div className="bet-slip-summary-row bet-slip-summary-row--return">
                <span>Potential Return</span>
                <span className="bet-slip-return-value">
                  ${betType === "ACCUMULATOR" ? accaPotentialReturn.toFixed(2) : potentialReturn.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="bet-slip-place-btn"
              onClick={handlePlace}
              disabled={placing || betCount === 0}
            >
              {placing ? "Placing Bet…" : `Place Bet${betCount > 1 && betType === "SINGLES" ? "s" : ""}`}
            </button>

            {!user && (
              <p className="bet-slip-signin-hint">
                <a href="/auth/login">Sign in</a> to place bets
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
