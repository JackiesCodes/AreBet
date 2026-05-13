import { HomeBoard } from "@/components/features/match/HomeBoard"
import { OnboardingModal } from "@/components/features/onboarding/OnboardingModal"
import { HighlightedMatches } from "@/components/features/match/HighlightedMatches"

export default function HomePage() {
  return (
    <>
      <HighlightedMatches />
      <HomeBoard />
      <OnboardingModal />
    </>
  )
}
