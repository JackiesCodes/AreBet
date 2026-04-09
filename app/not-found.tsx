import Link from "next/link"

export default function NotFound() {
  return (
    <div className="md-page">
      <div className="md-empty" style={{ minHeight: "60vh" }}>
        <div className="md-empty-icon">404</div>
        <div className="md-empty-title">Page not found</div>
        <div className="md-empty-text">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </div>
        <Link href="/" className="md-btn md-btn--primary">Back to home</Link>
      </div>
    </div>
  )
}
