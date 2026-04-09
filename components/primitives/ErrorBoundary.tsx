"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { ErrorState } from "./ErrorState"

interface Props {
  fallback?: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("[ErrorBoundary]", error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorState text={this.state.message} />
    }
    return this.props.children
  }
}
