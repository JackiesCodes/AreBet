import Link from "next/link"

const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-grid">
          <div className="footer-col">
            <span className="footer-col-heading">Platform</span>
            <Link href="/" className="footer-link">Home</Link>
            <Link href="/predictions" className="footer-link">Predictions</Link>
            <Link href="/odds-comparison" className="footer-link">Odds Comparison</Link>
            <Link href="/insights" className="footer-link">Intelligence</Link>
            <Link href="/standings" className="footer-link">Standings</Link>
            <Link href="/trust" className="footer-link">Track Record</Link>
          </div>

          <div className="footer-col">
            <span className="footer-col-heading">Account</span>
            <Link href="/subscription" className="footer-link">Upgrade to Pro</Link>
            <Link href="/user/dashboard" className="footer-link">Dashboard</Link>
            <Link href="/auth/login" className="footer-link">Sign In</Link>
            <Link href="/auth/signup" className="footer-link">Create Account</Link>
          </div>

          <div className="footer-col">
            <span className="footer-col-heading">Resources</span>
            <Link href="/help" className="footer-link">Help &amp; FAQ</Link>
            <Link href="/terms" className="footer-link">Terms of Service</Link>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
          </div>

          <div className="footer-col footer-col--social">
            <span className="footer-col-heading">Follow Us</span>
            <a
              href="https://twitter.com/arebet"
              className="footer-link footer-social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="AreBet on X (Twitter)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X (Twitter)
            </a>
            <a
              href="https://instagram.com/arebet"
              className="footer-link footer-social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="AreBet on Instagram"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Instagram
            </a>
          </div>
        </div>

        <div className="footer-legal">
          <span>© {CURRENT_YEAR} AreBet. All rights reserved.</span>
          <span className="footer-disclaimer">AreBet is an information and analytics platform. We do not accept wagers or facilitate gambling.</span>
        </div>
      </div>
    </footer>
  )
}
