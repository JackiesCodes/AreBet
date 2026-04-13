"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/primitives/Button"

const TIERS = [
  {
    name: "Free",
    price: "$0",
    features: ["Live matches", "Basic predictions", "Up to 5 watchlist items"],
    cta: "Current plan",
    featured: false,
    disabled: true,
  },
  {
    name: "Pro",
    price: "$7.99",
    features: ["Full predictions", "Odds comparison", "Pick slip", "Unlimited watchlist items"],
    cta: "Upgrade to Pro",
    featured: true,
    disabled: false,
  },
  {
    name: "Elite",
    price: "$12.99",
    features: ["Everything in Pro", "Advanced analytics", "AI insights", "Priority support"],
    cta: "Go Elite",
    featured: false,
    disabled: false,
  },
]

export default function SubscriptionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)

  function handleUpgrade(tierName: string) {
    if (!user) {
      router.push("/auth/signup?next=/subscription")
      return
    }
    setToast(`${tierName} upgrade coming soon — payment integration in progress.`)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="md-page">
      <PageHeader title="Subscription" subtitle="Choose a plan that fits your edge" />

      {toast && (
        <div className="md-banner md-banner--info" style={{ marginBottom: 20 }}>
          {toast}
        </div>
      )}

      <div className="price-grid">
        {TIERS.map((tier) => (
          <div key={tier.name} className={`price-card${tier.featured ? " price-card--featured" : ""}`}>
            <span className="price-tier-name">{tier.name}</span>
            <div className="price-amount">
              {tier.price}
              <span className="price-amount-suffix"> /month</span>
            </div>
            <ul className="price-features">
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Button
              variant={tier.featured ? "primary" : "secondary"}
              block
              disabled={tier.disabled}
              onClick={() => !tier.disabled && handleUpgrade(tier.name)}
            >
              {tier.cta}
            </Button>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
        All plans include a 7-day free trial. Cancel anytime.
      </p>
    </div>
  )
}
