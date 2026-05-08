"use client"

import { useEffect, useRef, useState } from "react"
import { loadOnboarding, markOnboardingSeen } from "@/lib/storage/onboarding"
import { Button } from "@/components/primitives/Button"
import { useFocusTrap, useEscapeKey } from "@/lib/utils/a11y"

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
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const state = loadOnboarding()
    if (!state.hasSeenWelcome) setOpen(true)
  }, [])

  const close = () => {
    markOnboardingSeen()
    setOpen(false)
  }

  useFocusTrap(dialogRef, open)
  useEscapeKey(close, open)

  if (!open) return null

  const isLast  = step === STEPS.length - 1
  const current = STEPS[step]
  const titleId = "onboarding-title"
  const descId  = "onboarding-desc"

  return (
    <div
      className="md-modal-backdrop"
      role="presentation"
      aria-hidden={!open}
    >
      <div
        ref={dialogRef}
        className="md-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* Step counter for screen readers */}
        <p className="sr-only">
          Step {step + 1} of {STEPS.length}
        </p>
        <h3 id={titleId} className="md-modal-title">{current.title}</h3>
        <p  id={descId}  className="md-modal-text">{current.text}</p>

        {/* Step dots — visual only */}
        <div
          className="md-modal-steps"
          aria-hidden="true"
          style={{ display: "flex", gap: 6, marginBottom: 16 }}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: i === step ? "var(--primary)" : "var(--border-strong)",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={close}>
            Skip
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (isLast) { close() } else { setStep((s) => s + 1) }
            }}
          >
            {isLast ? "Get Started" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}
