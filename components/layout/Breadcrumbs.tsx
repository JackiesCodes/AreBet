import Link from "next/link"

interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: Crumb[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="md-breadcrumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={i}>
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
          {i < items.length - 1 && <span style={{ margin: "0 6px", opacity: 0.5 }}>›</span>}
        </span>
      ))}
    </nav>
  )
}
