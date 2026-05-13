"use client"

import { useId, useRef, useState } from "react"
import type { BetRecord } from "@/types/bet"
import { cn } from "@/lib/utils/cn"
import { useFocusTrap, useEscapeKey } from "@/lib/utils/a11y"

interface LogBetModalProps {
  onClose: () => void
  onSave: (bet: Omit<BetRecord, "id" | "user_id" | "created_at">) => Promise<void>
}

const MARKETS = ["1X2", "BTTS", "OVER25", "UNDER25", "DNB"] as const
const SELECTIONS: Record<string, string[]> = {
  "1X2":    ["HOME", "DRAW", "AWAY"],
  BTTS:     ["YES", "NO"],
  OVER25:   ["OVER"],
  UNDER25:  ["UNDER"],
  DNB:      ["HOME", "AWAY"],
}

export function LogBetModal({ onClose, onSave }: LogBetModalProps) {
  const [teams,     setTeams]     = useState("")
  const [league,    setLeague]    = useState("")
  const [market,    setMarket]    = useState<BetRecord["market"]>("1X2")
  const [selection, setSelection] = useState<BetRecord["selection"]>("HOME")
  const [stake,     setStake]     = useState("")
  const [odds,      setOdds]      = useState("")
  const [result,    setResult]    = useState<BetRecord["result"]>("PENDING")
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState<string | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)

  // Stable IDs for label↔input associations
  const uid       = useId()
  const teamsId   = `${uid}-teams`
  const leagueId  = `${uid}-league`
  const marketId  = `${uid}-market`
  const selId     = `${uid}-selection`
  const stakeId   = `${uid}-stake`
  const oddsId    = `${uid}-odds`
  const errorId   = `${uid}-error`

  useFocusTrap(dialogRef, true)
  useEscapeKey(onClose)

  const stakeNum   = parseFloat(stake)
  const oddsNum    = parseFloat(odds)
  const potReturn  = !isNaN(stakeNum) && !isNaN(oddsNum)
    ? (stakeNum * oddsNum).toFixed(2)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!teams.trim())                          return setErr("Match/teams is required")
    if (isNaN(stakeNum) || stakeNum <= 0)       return setErr("Enter a valid stake")
    if (isNaN(oddsNum)  || oddsNum  <= 1)       return setErr("Odds must be greater than 1.00")

    setSaving(true)
    try {
      await onSave({
        matchId:   0,
        teams:     teams.trim(),
        league:    league.trim() || undefined,
        market,
        selection,
        stake:     stakeNum,
        odds:      oddsNum,
        result,
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save bet")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="lbm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className="lbm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={err ? errorId : undefined}
      >
        <div className="lbm-header">
          <span id={`${uid}-title`} className="lbm-title">Log a Bet</span>
          <button
            type="button"
            className="lbm-close"
            onClick={onClose}
            aria-label="Close log-a-bet dialog"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="lbm-form" noValidate>
          <div className="lbm-field">
            <label className="lbm-label" htmlFor={teamsId}>
              Match <span aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id={teamsId}
              className="md-input"
              placeholder="e.g. Arsenal vs Man City"
              value={teams}
              onChange={(e) => setTeams(e.target.value)}
              required
              aria-required="true"
              aria-invalid={err?.includes("teams") ? "true" : undefined}
            />
          </div>

          <div className="lbm-field">
            <label className="lbm-label" htmlFor={leagueId}>League</label>
            <input
              id={leagueId}
              className="md-input"
              placeholder="e.g. Premier League"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
            />
          </div>

          <div className="lbm-row">
            <div className="lbm-field">
              <label className="lbm-label" htmlFor={marketId}>Market</label>
              <select
                id={marketId}
                className="md-input"
                value={market}
                onChange={(e) => {
                  const m = e.target.value as BetRecord["market"]
                  setMarket(m)
                  setSelection(SELECTIONS[m][0] as BetRecord["selection"])
                }}
              >
                {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="lbm-field">
              <label className="lbm-label" htmlFor={selId}>Selection</label>
              <select
                id={selId}
                className="md-input"
                value={selection}
                onChange={(e) => setSelection(e.target.value as BetRecord["selection"])}
              >
                {(SELECTIONS[market] ?? []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="lbm-row">
            <div className="lbm-field">
              <label className="lbm-label" htmlFor={stakeId}>
                Stake ($) <span className="sr-only">(required)</span>
              </label>
              <input
                id={stakeId}
                className="md-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="10.00"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                required
                aria-required="true"
                aria-invalid={err?.includes("stake") ? "true" : undefined}
              />
            </div>
            <div className="lbm-field">
              <label className="lbm-label" htmlFor={oddsId}>
                Odds (decimal) <span className="sr-only">(required, must be greater than 1.00)</span>
              </label>
              <input
                id={oddsId}
                className="md-input"
                type="number"
                min="1.01"
                step="0.01"
                placeholder="2.10"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                required
                aria-required="true"
                aria-invalid={err?.includes("Odds") ? "true" : undefined}
              />
            </div>
          </div>

          {potReturn && (
            <div className="lbm-return" aria-live="polite" aria-atomic="true">
              Potential return: <strong>${potReturn}</strong>
              {" "}(profit: <strong>${(parseFloat(potReturn) - stakeNum).toFixed(2)}</strong>)
            </div>
          )}

          {/* Result — fieldset groups the radio-like buttons semantically */}
          <fieldset className="lbm-field lbm-fieldset">
            <legend className="lbm-label">Result</legend>
            <div className="lbm-result-row" role="group">
              {(["PENDING", "WIN", "LOSS", "PUSH"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={cn(
                    "lbm-result-btn",
                    result === r && "lbm-result-btn--active",
                    `lbm-result-btn--${r.toLowerCase()}`,
                  )}
                  onClick={() => setResult(r)}
                  aria-pressed={result === r}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>

          {err && (
            <p id={errorId} className="lbm-error" role="alert" aria-live="assertive">
              {err}
            </p>
          )}

          <div className="lbm-actions">
            <button
              type="button"
              className="md-btn md-btn--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="md-btn md-btn--primary"
              disabled={saving}
              aria-busy={saving}
              aria-describedby={err ? errorId : undefined}
            >
              {saving ? "Saving…" : "Save Bet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
