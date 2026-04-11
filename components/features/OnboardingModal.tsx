"use client"

import { useEffect, useState } from "react"
import { loadOnboarding, markOnboardingSeen } from "@/lib/storage/onboarding"
import { Button } from "@/components/primitives/Button"

const STEPS = [
  {
    title: "Welcome to AreBet",
    text: "Smart Betting. Simple Insights. Get a single command center for live matches, predictions, and odds.",
  },
  {
    title: "Confidence Heatmaps",
    text: "Each match shows our model confidence (low/mid/high). Use it to filter the noise quickly.",
  },
  {
    title: "Track Your Picks",
    text: "Click any match to see signals and insights, then add picks to your slip to track your decisions.",
  },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const state = loadOnboarding()
    if (!state.hasSeenWelcome) setOpen(true)
  }, [])

  if (!open) return null

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="md-modal-backdrop">
      <div className="md-modal">
        <h3 className="md-modal-title">{current.title}</h3>
        <p className="md-modal-text">{current.text}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button
            variant="ghost"
            onClick={() => {
              markOnboardingSeen()
              setOpen(false)
            }}
          >
            Skip
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (isLast) {
                markOnboardingSeen()
                setOpen(false)
              } else {
                setStep((s) => s + 1)
              }
            }}
          >
            {isLast ? "Get Started" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}
