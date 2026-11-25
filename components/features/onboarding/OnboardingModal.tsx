"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { loadOnboarding, markOnboardingSeen } from "@/lib/storage/onboarding"
import { Button } from "@/components/primitives/Button"
import { TierBadge } from "@/components/primitives/TierBadge"
import { useFocusTrap, useEscapeKey } from "@/lib/utils/a11y"

const STEPS = [
  {
    icon: "⚽",
    title: "Live odds across top leagues",
    text: "Bet on Premier League, La Liga, Bundesliga, Serie A and more — all in one place. Click any odds button to add it straight to your bet slip.",
  },
  {
    icon: "🎫",
    title: "Singles and accumulators",
    text: "Build a slip with one click. Switch between singles and accumulator mode to see combined odds and your potential return before you place.",
  },
  {
    icon: "💰",
    title: "Track every bet you place",
    text: "Head to My Bets to see your open and settled wagers. Your balance updates instantly after each bet is placed.",
  },
  {
    icon: "🎁",
    title: "Bonuses and promotions",
    text: "New members get a 100% welcome bonus up to $200. Check the Promotions page regularly for free bets, acca boosts and loyalty rewards.",
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
        <p className="sr-only">Step {step + 1} of {STEPS.length}</p>

        {/* Icon */}
        <div style={{ fontSize: 32, marginBottom: 12, lineHeight: 1 }} aria-hidden="true">
          {current.icon}
        </div>

        <h3 id={titleId} className="md-modal-title">{current.title}</h3>
        <p  id={descId}  className="md-modal-text">{current.text}</p>

        {/* Step dots */}
        <div
          className="md-modal-steps"
          aria-hidden="true"
          style={{ display: "flex", gap: 6, marginBottom: 16 }}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step ? "var(--primary)" : "var(--border-strong)",
                transition: "width 0.2s, background 0.2s",
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
            {isLast ? "Get Started" : "Next →"}
          </Button>
        </div>

        {isLast && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <TierBadge tier="pro" />
            <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
              Unlock market movement, advanced odds &amp; ROI analytics
            </span>
            <Link href="/subscription" className="md-btn md-btn--primary md-btn--sm" onClick={close}>
              Upgrade
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
