import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/context"
import { ToastProvider } from "@/components/primitives/Toast"
import { MainNav } from "@/components/layout/MainNav"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { DensityShell } from "@/components/layout/DensityShell"
import { AppShell } from "@/components/layout/AppShell"
import { StickinessSync } from "@/components/features/StickinessSync"
import { PwaRegister } from "@/components/features/PwaRegister"
import { ErrorBoundary } from "@/components/primitives/ErrorBoundary"
import { MatchIntelligenceProvider } from "@/contexts/MatchIntelligenceContext"
import { FilterProvider } from "@/contexts/FilterContext"

export const metadata: Metadata = {
  title: "AreBet — Smart Betting. Simple Insights.",
  description:
    "AreBet is a smart football betting intelligence platform. Track live matches, predictions, and odds in one place.",
  applicationName: "AreBet",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/arebet-logo.svg", apple: "/arebet-logo.svg" },
}

export const viewport: Viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

const FOUC_SCRIPT = `
(function(){
  try {
    var theme = localStorage.getItem('arebet:theme:v1') || 'dark';
    document.documentElement.dataset.theme = theme;
    var prefs = JSON.parse(localStorage.getItem('arebet:preferences:v1') || '{}');
    document.documentElement.dataset.density = prefs.density || 'compact';
  } catch(e) {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.dataset.density = 'compact';
  }
})();
`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" data-density="compact">
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <MatchIntelligenceProvider>
              <FilterProvider>
                <DensityShell>
                  <StickinessSync />
                  <PwaRegister />
                  <div className="site-shell">
                    <MainNav />
                    <div className="site-main">
                      <AppShell>
                        <ErrorBoundary>{children}</ErrorBoundary>
                      </AppShell>
                    </div>
                    <MobileBottomNav />
                  </div>
                </DensityShell>
              </FilterProvider>
            </MatchIntelligenceProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
