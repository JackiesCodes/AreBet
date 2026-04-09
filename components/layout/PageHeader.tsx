import type { ReactNode } from "react"
import { Breadcrumbs } from "./Breadcrumbs"

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: { label: string; href?: string }[]
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="md-page-header">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="md-page-title">{title}</h1>
          {subtitle && <p className="md-page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </header>
  )
}
