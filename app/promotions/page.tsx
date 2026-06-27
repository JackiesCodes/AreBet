import Link from "next/link"

interface PromoCardProps {
  title: string
  description: string
  cta: string
  ctaHref: string
  badge?: string
  icon: React.ReactNode
}

function PromoCard({ title, description, cta, ctaHref, badge, icon }: PromoCardProps) {
  return (
    <div className="promo-card">
      {badge && <span className="promo-card-badge">{badge}</span>}
      <div className="promo-card-icon" aria-hidden>{icon}</div>
      <h2 className="promo-card-title">{title}</h2>
      <p className="promo-card-desc">{description}</p>
      <Link href={ctaHref} className="promo-card-cta">
        {cta}
      </Link>
      <p className="promo-card-terms">18+ | T&amp;Cs Apply | Please Bet Responsibly</p>
    </div>
  )
}

export default function PromotionsPage() {
  return (
    <div className="promotions-page">
      <div className="promotions-hero">
        <h1 className="promotions-hero-title">Promotions &amp; Offers</h1>
        <p className="promotions-hero-sub">Exclusive bonuses and rewards for AreBet members</p>
      </div>

      <div className="promo-card-grid">
        <PromoCard
          title="100% Welcome Bonus"
          description="Get a 100% match bonus on your first deposit, up to $200. Kick off your betting journey with double the funds."
          cta="Claim Welcome Bonus"
          ctaHref="/deposit"
          badge="NEW MEMBERS"
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />

        <PromoCard
          title="$10 Free Bet"
          description="Place your first deposit of $20 or more and receive a $10 free bet to use on any market. No strings attached."
          cta="Get Free Bet"
          ctaHref="/deposit"
          badge="FIRST DEPOSIT"
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
          }
        />

        <PromoCard
          title="Accumulator Boost"
          description="Earn an extra 20% on your winnings when your accumulator has 5 or more selections and all win. Stack the odds in your favour."
          cta="Build an Accumulator"
          ctaHref="/"
          badge="ACCA BOOST"
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />

        <PromoCard
          title="Refer a Friend"
          description="Invite a friend to join AreBet. When they place their first bet, you both receive a $15 free bet. Share the love."
          cta="Invite Friends"
          ctaHref="/user/profile"
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />

        <PromoCard
          title="Odds Boost of the Day"
          description="Check back daily for a featured selection with boosted odds. Today's boost could be your best bet of the day."
          cta="View Today's Boost"
          ctaHref="/"
          badge="DAILY"
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />

        <PromoCard
          title="Loyalty Rewards"
          description="Every bet earns you loyalty points. Reach Pro or Elite tier and unlock exclusive odds, higher limits, and VIP support."
          cta="View My Tier"
          ctaHref="/user/profile"
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
        />
      </div>

      <div className="promotions-disclaimer">
        <p>
          <strong>Responsible Gambling:</strong> All bonuses are subject to terms and conditions.
          Minimum odds and wagering requirements apply. AreBet promotes responsible gambling.
          If you feel you may have a gambling problem, please visit{" "}
          <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">
            BeGambleAware.org
          </a>
          . 18+ only.
        </p>
      </div>
    </div>
  )
}
