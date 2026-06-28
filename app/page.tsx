import { HomeBoard } from "@/components/features/match/HomeBoard"
import { OnboardingModal } from "@/components/features/onboarding/OnboardingModal"
import { HighlightedMatches } from "@/components/features/match/HighlightedMatches"
import { HeroBanner } from "@/components/features/promotions/HeroBanner"
import { PopularMarkets } from "@/components/features/betting/PopularMarkets"

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <HighlightedMatches />
      <PopularMarkets />
      <HomeBoard />
      <OnboardingModal />
    </>
  )
}
