"use client"

import { useEffect, useState, Suspense } from "react"
import { useAuth } from "@/lib/auth/context"
import { useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/primitives/Button"

const TIERS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "",
    features: ["Live match feed", "Basic predictions", "Up to 5 watchlist items", "Bet tracker (local)"],
    cta: "Current plan",
    featured: false,
    disabled: true,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$7.99",
    period: "/month",
    features: ["Full predictions + confidence tiers", "Odds comparison + arb alerts", "Unlimited watchlist", "Bet tracker synced across devices"],
    cta: "Upgrade to Pro",
    featured: true,
    disabled: false,
  },
  {
    key: "elite",
    name: "Elite",
    price: "$12.99",
    period: "/month",
    features: ["Everything in Pro", "Deep player stats", "Advanced analytics", "Priority support"],
    cta: "Go Elite",
    featured: false,
    disabled: false,
  },
]

function SubscriptionContent() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null)
  const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

  useEffect(() => {
    if (params.get("success")) {
      setBanner({ type: "success", text: "Subscription activated! Your plan will update shortly." })
    } else if (params.get("cancelled")) {
      setBanner({ type: "info", text: "Checkout cancelled — you haven't been charged." })
    }
  }, [params])

  async function handleUpgrade(tierKey: string) {
    if (!user) {
      router.push(`/auth/signup?next=/subscription`)
      return
    }
    if (!stripeConfigured) {
      setBanner({ type: "info", text: "Payment not yet configured — add STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID to .env.local." })
      return
    }

    setLoading(tierKey)
    setBanner(null)
    try {
      const res = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed")
      window.location.href = data.url
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Checkout failed" })
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading("portal")
    try {
      const res = await fetch("/api/subscription/portal", { method: "POST" })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Portal unavailable")
      window.location.href = data.url
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Portal unavailable" })
      setLoading(null)
    }
  }

  return (
    <div className="md-page">
      <PageHeader
        title="Subscription"
        subtitle="Choose a plan that fits your edge"
        actions={
          user ? (
            <button
              type="button"
              className="md-btn md-btn--ghost md-btn--sm"
              onClick={handlePortal}
              disabled={loading === "portal"}
            >
              {loading === "portal" ? "Opening…" : "Manage billing"}
            </button>
          ) : undefined
        }
      />

      {banner && (
        <div className={`md-banner md-banner--${banner.type}`} style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
          {banner.text}
        </div>
      )}

      {!stripeConfigured && (
        <div className="admin-warn-box" style={{ marginBottom: 20, fontSize: 12 }}>
          <strong>Payments not yet configured.</strong> Add{" "}
          <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRO_PRICE_ID</code>, and{" "}
          <code>STRIPE_ELITE_PRICE_ID</code> to <code>.env.local</code> to enable checkout.
        </div>
      )}

      <div className="price-grid">
        {TIERS.map((tier) => (
          <div key={tier.key} className={`price-card${tier.featured ? " price-card--featured" : ""}`}>
            <span className="price-tier-name">{tier.name}</span>
            <div className="price-amount">
              {tier.price}
              {tier.period && <span className="price-amount-suffix">{tier.period}</span>}
            </div>
            <ul className="price-features">
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Button
              variant={tier.featured ? "primary" : "secondary"}
              block
              disabled={tier.disabled || loading !== null}
              loading={loading === tier.key}
              onClick={() => !tier.disabled && handleUpgrade(tier.key)}
            >
              {tier.cta}
            </Button>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
        All paid plans include a 7-day free trial. Cancel anytime from the billing portal.
      </p>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionContent />
    </Suspense>
  )
}
