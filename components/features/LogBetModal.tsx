"use client"

import { useState } from "react"
import type { BetRecord } from "@/types/bet"
import { cn } from "@/lib/utils/cn"

interface LogBetModalProps {
  onClose: () => void
  onSave: (bet: Omit<BetRecord, "id" | "user_id" | "created_at">) => Promise<void>
}

const MARKETS = ["1X2", "BTTS", "OVER25", "UNDER25", "DNB"] as const
const SELECTIONS: Record<string, string[]> = {
  "1X2": ["HOME", "DRAW", "AWAY"],
  BTTS: ["YES", "NO"],
  OVER25: ["OVER"],
  UNDER25: ["UNDER"],
  DNB: ["HOME", "AWAY"],
}

export function LogBetModal({ onClose, onSave }: LogBetModalProps) {
  const [teams, setTeams] = useState("")
  const [league, setLeague] = useState("")
  const [market, setMarket] = useState<BetRecord["market"]>("1X2")
  const [selection, setSelection] = useState<BetRecord["selection"]>("HOME")
  const [stake, setStake] = useState("")
  const [odds, setOdds] = useState("")
  const [result, setResult] = useState<BetRecord["result"]>("PENDING")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const stakeNum = parseFloat(stake)
  const oddsNum = parseFloat(odds)
  const potReturn = !isNaN(stakeNum) && !isNaN(oddsNum) ? (stakeNum * oddsNum).toFixed(2) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!teams.trim()) return setErr("Match/teams is required")
    if (isNaN(stakeNum) || stakeNum <= 0) return setErr("Enter a valid stake")
    if (isNaN(oddsNum) || oddsNum <= 1) return setErr("Odds must be greater than 1.00")

    setSaving(true)
    try {
      await onSave({
        matchId: 0,
        teams: teams.trim(),
        league: league.trim() || undefined,
        market,
        selection,
        stake: stakeNum,
        odds: oddsNum,
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
    <div className="lbm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lbm-modal" role="dialog" aria-modal aria-label="Log a bet">
        <div className="lbm-header">
          <span className="lbm-title">Log a Bet</span>
          <button type="button" className="lbm-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="lbm-form">
          <div className="lbm-field">
            <label className="lbm-label">Match *</label>
            <input
              className="md-input"
              placeholder="e.g. Arsenal vs Man City"
              value={teams}
              onChange={(e) => setTeams(e.target.value)}
              required
            />
          </div>

          <div className="lbm-field">
            <label className="lbm-label">League</label>
            <input
              className="md-input"
              placeholder="e.g. Premier League"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
            />
          </div>

          <div className="lbm-row">
            <div className="lbm-field">
              <label className="lbm-label">Market</label>
              <select
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
              <label className="lbm-label">Selection</label>
              <select
                className="md-input"
                value={selection}
                onChange={(e) => setSelection(e.target.value as BetRecord["selection"])}
              >
                {(SELECTIONS[market] ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="lbm-row">
            <div className="lbm-field">
              <label className="lbm-label">Stake ($)</label>
              <input
                className="md-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="10.00"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                required
              />
            </div>
            <div className="lbm-field">
              <label className="lbm-label">Odds (decimal)</label>
              <input
                className="md-input"
                type="number"
                min="1.01"
                step="0.01"
                placeholder="2.10"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                required
              />
            </div>
          </div>

          {potReturn && (
            <div className="lbm-return">
              Potential return: <strong>${potReturn}</strong>
              {" "}(profit: <strong>${(parseFloat(potReturn) - stakeNum).toFixed(2)}</strong>)
            </div>
          )}

          <div className="lbm-field">
            <label className="lbm-label">Result</label>
            <div className="lbm-result-row">
              {(["PENDING", "WIN", "LOSS", "PUSH"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={cn("lbm-result-btn", result === r && "lbm-result-btn--active", `lbm-result-btn--${r.toLowerCase()}`)}
                  onClick={() => setResult(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {err && <p className="lbm-error">{err}</p>}

          <div className="lbm-actions">
            <button type="button" className="md-btn md-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="md-btn md-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save Bet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
