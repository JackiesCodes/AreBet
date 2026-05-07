import { HomeBoard } from "@/components/features/HomeBoard"
import { OnboardingModal } from "@/components/features/OnboardingModal"
import { HighlightedMatches } from "@/components/features/HighlightedMatches"

export default function HomePage() {
  return (
    <>
      <HighlightedMatches />
      <HomeBoard />
      <OnboardingModal />
    </>
  )
}
