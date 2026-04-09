"use client"

import { STORAGE_KEYS, readJSON, writeJSON } from "./stickiness"

interface OnboardingState {
  hasSeenWelcome: boolean
  completedSteps: string[]
}

const DEFAULT_ONBOARDING: OnboardingState = {
  hasSeenWelcome: false,
  completedSteps: [],
}

export function loadOnboarding(): OnboardingState {
  return { ...DEFAULT_ONBOARDING, ...readJSON<Partial<OnboardingState>>(STORAGE_KEYS.onboarding, {}) }
}

export function markOnboardingSeen(): void {
  const current = loadOnboarding()
  writeJSON(STORAGE_KEYS.onboarding, { ...current, hasSeenWelcome: true })
}

export function completeStep(step: string): void {
  const current = loadOnboarding()
  if (current.completedSteps.includes(step)) return
  writeJSON(STORAGE_KEYS.onboarding, {
    ...current,
    completedSteps: [...current.completedSteps, step],
  })
}
