"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { cn } from "@/lib/utils/cn"
import Link from "next/link"

const QUICK_AMOUNTS = [10, 25, 50, 100, 200]

interface WalletTransaction {
  id: string
  type: string
  amount: number
  balance_after: number
  reference_type: string | null
  created_at: string
}

interface WalletState {
  currency: string
  isRealMoney: boolean
  withdrawalsEnabled: boolean
  balance: number
  transactions: WalletTransaction[]
  providers: { id: string; label: string }[]
}

type Mode = "deposit" | "withdraw"

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth()
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [mode, setMode] = useState<Mode>("deposit")
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [providerId, setProviderId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadWallet = useCallback(async () => {
    const res = await fetch("/api/wallet")
    if (!res.ok) return
    const json = (await res.json()) as WalletState
    setWallet(json)
    setProviderId((current) => current || json.providers[0]?.id || "")
  }, [])

  useEffect(() => {
    if (!user) return
    loadWallet()
  }, [user, loadWallet])

  const effectiveAmount = selectedAmount ?? (parseFloat(customAmount) || 0)

  async function handleSubmit() {
    if (!user || !wallet) return
    if (effectiveAmount <= 0) {
      setMessage({ type: "error", text: "Please select or enter an amount." })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const endpoint = mode === "deposit" ? "/api/wallet/deposit" : "/api/wallet/withdraw"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount, providerId }),
      })

      const json = await res.json()

      if (!res.ok) {
        setMessage({ type: "error", text: json.error || `${mode === "deposit" ? "Deposit" : "Withdrawal"} failed.` })
      } else {
        setMessage({
          type: "success",
          text:
            mode === "deposit"
              ? `Successfully deposited ${effectiveAmount.toFixed(2)} ${wallet.currency}.`
              : `Withdrawal request submitted (${json.status}).`,
        })
        setSelectedAmount(null)
        setCustomAmount("")
        await loadWallet()
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="deposit-page">
        <div className="deposit-loading">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="deposit-page">
        <div className="deposit-empty">
          <h2>Sign in to manage your wallet</h2>
          <Link href="/auth/login" className="md-btn md-btn--primary">Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="deposit-page">
      <div className="deposit-header">
        <h1 className="deposit-title">
          Wallet
          {wallet && (
            <span className={cn("deposit-mode-badge", wallet.isRealMoney ? "deposit-mode-badge--real" : "deposit-mode-badge--sandbox")}>
              {wallet.isRealMoney ? "Real Money" : "Demo"}
            </span>
          )}
        </h1>
      </div>

      {/* Balance display */}
      <div className="deposit-balance-card">
        <span className="deposit-balance-label">Current Balance</span>
        <span className="deposit-balance-value">
          {wallet ? `${wallet.balance.toFixed(2)} ${wallet.currency}` : "Loading…"}
        </span>
      </div>

      {/* Deposit / withdraw tabs */}
      <div className="deposit-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "deposit"}
          className={cn("deposit-tab", mode === "deposit" && "deposit-tab--active")}
          onClick={() => {
            setMode("deposit")
            setMessage(null)
          }}
        >
          Deposit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "withdraw"}
          className={cn("deposit-tab", mode === "withdraw" && "deposit-tab--active")}
          onClick={() => {
            setMode("withdraw")
            setMessage(null)
          }}
        >
          Withdraw
        </button>
      </div>

      {mode === "withdraw" && wallet && !wallet.withdrawalsEnabled && (
        <div className="deposit-message deposit-message--error">
          Withdrawals are currently unavailable.
        </div>
      )}

      {/* Amount selector */}
      <div className="deposit-section">
        <h2 className="deposit-section-title">Select Amount</h2>

        <div className="deposit-quick-amounts">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              className={cn("deposit-quick-btn", selectedAmount === amount && "deposit-quick-btn--active")}
              onClick={() => {
                setSelectedAmount(amount)
                setCustomAmount("")
              }}
            >
              {amount}
            </button>
          ))}
        </div>

        <div className="deposit-custom">
          <label htmlFor="custom-amount" className="deposit-custom-label">
            Custom Amount
          </label>
          <div className="deposit-custom-input-wrap">
            <span className="deposit-currency">{wallet?.currency ?? ""}</span>
            <input
              id="custom-amount"
              type="number"
              min="1"
              step="1"
              placeholder="0.00"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedAmount(null)
              }}
              className="deposit-custom-input"
            />
          </div>
        </div>

        {wallet && wallet.providers.length > 0 && (
          <select
            className="deposit-provider-select"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            aria-label="Payment method"
          >
            {wallet.providers.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={cn("deposit-message", `deposit-message--${message.type}`)}>
          {message.text}
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        className="deposit-btn"
        onClick={handleSubmit}
        disabled={submitting || effectiveAmount <= 0 || (mode === "withdraw" && wallet !== null && !wallet.withdrawalsEnabled)}
      >
        {submitting
          ? "Processing…"
          : `${mode === "deposit" ? "Deposit" : "Withdraw"} ${effectiveAmount > 0 ? effectiveAmount.toFixed(2) : ""}`}
      </button>

      <p className="deposit-disclaimer">
        {wallet?.isRealMoney
          ? "18+ | Please gamble responsibly."
          : "This is a demo wallet. No real money is involved. 18+ | Please gamble responsibly."}
      </p>

      {/* Transaction history */}
      {wallet && wallet.transactions.length > 0 && (
        <div className="deposit-history">
          <h2 className="deposit-section-title">Recent Transactions</h2>
          <div className="deposit-tx-list">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="deposit-tx-item">
                <div className="deposit-tx-info">
                  <span className="deposit-tx-type">{formatTxType(tx.type)}</span>
                  <span className="deposit-tx-date">
                    {new Date(tx.created_at).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className={cn("deposit-tx-amount", tx.amount >= 0 ? "deposit-tx-amount--credit" : "deposit-tx-amount--debit")}>
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatTxType(type: string): string {
  switch (type) {
    case "deposit": return "Deposit"
    case "withdrawal": return "Withdrawal"
    case "bet_debit": return "Bet Placed"
    case "bet_credit": return "Bet Won"
    case "bet_void_refund": return "Bet Void / Refund"
    case "bonus_credit": return "Bonus"
    case "adjustment": return "Adjustment"
    case "casino_debit": return "Casino Bet"
    case "casino_credit": return "Casino Win"
    default: return type
  }
}
