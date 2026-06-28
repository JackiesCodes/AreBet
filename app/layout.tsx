import type { Metadata, Viewport } from "next"
import { Suspense, type ReactNode } from "react"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/context"
import { ToastProvider } from "@/components/primitives/Toast"
import { MainNav } from "@/components/layout/MainNav"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { Footer } from "@/components/layout/Footer"
import { DensityShell } from "@/components/layout/DensityShell"
import { AppShell } from "@/components/layout/AppShell"
import { StickinessSync } from "@/components/features/onboarding/StickinessSync"
import { PwaRegister } from "@/components/features/onboarding/PwaRegister"
import { ErrorBoundary } from "@/components/primitives/ErrorBoundary"
import { MatchFeedProvider } from "@/contexts/MatchFeedContext"
import { FilterProvider } from "@/contexts/FilterContext"
import { SelectedMatchProvider } from "@/contexts/SelectedMatchContext"
import { BetSlipProvider } from "@/contexts/BetSlipContext"

export const metadata: Metadata = {
  title: "AreBet — Sports Betting",
  description:
    "AreBet is a sports betting platform. Bet on live and upcoming matches with real-time odds.",
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
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AuthProvider>
          <ToastProvider>
            <BetSlipProvider>
            <MatchFeedProvider>
              <Suspense>
                <FilterProvider>
                  <SelectedMatchProvider>
                  <DensityShell>
                    <StickinessSync />
                    <PwaRegister />
                    <div className="site-shell">
                      <MainNav />
                      <div className="site-main">
                        <AppShell>
                          <main id="main-content" tabIndex={-1}>
                            <ErrorBoundary>{children}</ErrorBoundary>
                          </main>
                        </AppShell>
                      </div>
                      <MobileBottomNav />
                      <Footer />
                    </div>
                  </DensityShell>
                  </SelectedMatchProvider>
                </FilterProvider>
              </Suspense>
            </MatchFeedProvider>
            </BetSlipProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
