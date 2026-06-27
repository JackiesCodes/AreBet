"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils/cn"
import Link from "next/link"

const QUICK_AMOUNTS = [10, 25, 50, 100, 200]

interface Transaction {
  id: string
  amount: number
  type: string
  created_at: string
}

export default function DepositPage() {
  const { user, loading: authLoading } = useAuth()
  const [balance, setBalance] = useState<number | null>(null)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [depositing, setDepositing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    if (!user) return

    async function loadData() {
      const supabase = createClient()
      const { data } = await supabase
        .from("profiles")
        .select("bankroll")
        .eq("id", user!.id)
        .single()

      if (data) setBalance(data.bankroll ?? 0)
    }

    loadData()
  }, [user])

  const effectiveAmount = selectedAmount ?? (parseFloat(customAmount) || 0)

  async function handleDeposit() {
    if (!user) return
    if (effectiveAmount <= 0) {
      setMessage({ type: "error", text: "Please select or enter an amount." })
      return
    }

    setDepositing(true)
    setMessage(null)

    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount }),
      })

      const json = await res.json()

      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Deposit failed." })
      } else {
        setBalance(json.newBalance)
        setMessage({ type: "success", text: `Successfully deposited $${effectiveAmount.toFixed(2)}! New balance: $${json.newBalance.toFixed(2)}` })
        setSelectedAmount(null)
        setCustomAmount("")

        // Add to local transaction list
        setTransactions((prev) => [
          {
            id: Date.now().toString(),
            amount: effectiveAmount,
            type: "Deposit",
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setDepositing(false)
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
          <h2>Sign in to deposit funds</h2>
          <Link href="/auth/login" className="md-btn md-btn--primary">Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="deposit-page">
      <div className="deposit-header">
        <h1 className="deposit-title">Deposit Funds</h1>
      </div>

      {/* Balance display */}
      <div className="deposit-balance-card">
        <span className="deposit-balance-label">Current Balance</span>
        <span className="deposit-balance-value">
          {balance !== null ? `$${balance.toFixed(2)}` : "Loading…"}
        </span>
      </div>

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
              ${amount}
            </button>
          ))}
        </div>

        <div className="deposit-custom">
          <label htmlFor="custom-amount" className="deposit-custom-label">
            Custom Amount
          </label>
          <div className="deposit-custom-input-wrap">
            <span className="deposit-currency">$</span>
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
      </div>

      {/* Message */}
      {message && (
        <div className={cn("deposit-message", `deposit-message--${message.type}`)}>
          {message.text}
        </div>
      )}

      {/* Deposit button */}
      <button
        type="button"
        className="deposit-btn"
        onClick={handleDeposit}
        disabled={depositing || effectiveAmount <= 0}
      >
        {depositing ? "Processing…" : `Deposit ${effectiveAmount > 0 ? `$${effectiveAmount.toFixed(2)}` : ""}`}
      </button>

      <p className="deposit-disclaimer">
        This is a demo platform. No real money is involved. 18+ | Please gamble responsibly.
      </p>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="deposit-history">
          <h2 className="deposit-section-title">Recent Transactions</h2>
          <div className="deposit-tx-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="deposit-tx-item">
                <div className="deposit-tx-info">
                  <span className="deposit-tx-type">{tx.type}</span>
                  <span className="deposit-tx-date">
                    {new Date(tx.created_at).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className="deposit-tx-amount deposit-tx-amount--credit">
                  +${tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
