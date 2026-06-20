import Link from "next/link"

export function HeroBanner() {
  return (
    <div className="hero-banner" role="banner" aria-label="Welcome offer">
      <div className="hero-banner-content">
        <div className="hero-banner-text">
          <p className="hero-banner-eyebrow">Welcome to AreBet</p>
          <h2 className="hero-banner-title">Smart Betting.<br />Real Insights.</h2>
          <p className="hero-banner-sub">
            <strong>100% Welcome Bonus</strong> up to <strong>$200</strong> on your first deposit
          </p>
          <div className="hero-banner-actions">
            <Link href="/promotions" className="hero-banner-cta">
              Claim Offer
            </Link>
            <Link href="/deposit" className="hero-banner-cta hero-banner-cta--secondary">
              Deposit Now
            </Link>
          </div>
          <p className="hero-banner-disclaimer">18+ | T&amp;Cs Apply | Please Bet Responsibly</p>
        </div>
        <div className="hero-banner-graphic" aria-hidden>
          <div className="hero-banner-odds-preview">
            <div className="hero-banner-odds-row">
              <span className="hero-banner-odds-label">Home</span>
              <span className="hero-banner-odds-value">2.10</span>
            </div>
            <div className="hero-banner-odds-row">
              <span className="hero-banner-odds-label">Draw</span>
              <span className="hero-banner-odds-value">3.40</span>
            </div>
            <div className="hero-banner-odds-row">
              <span className="hero-banner-odds-label">Away</span>
              <span className="hero-banner-odds-value">3.75</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
