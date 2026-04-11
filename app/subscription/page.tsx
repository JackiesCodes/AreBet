import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/primitives/Button"

const TIERS = [
  {
    name: "Free",
    price: "$0",
    features: ["Live matches", "Basic predictions", "Up to 5 watchlist items"],
    cta: "Current plan",
    featured: false,
  },
  {
    name: "Pro",
    price: "$7.99",
    features: ["Full predictions", "Odds comparison", "Pick slip", "Unlimited watchlist items"],
    cta: "Upgrade to Pro",
    featured: true,
  },
  {
    name: "Elite",
    price: "$12.99",
    features: ["Everything in Pro", "Advanced analytics", "AI insights", "Priority support"],
    cta: "Go Elite",
    featured: false,
  },
]

export default function SubscriptionPage() {
  return (
    <div className="md-page">
      <PageHeader title="Subscription" subtitle="Choose a plan that fits your edge" />
      <div className="price-grid">
        {TIERS.map((tier) => (
          <div key={tier.name} className={`price-card ${tier.featured ? "price-card--featured" : ""}`}>
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
            <Button variant={tier.featured ? "primary" : "secondary"} block>{tier.cta}</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
