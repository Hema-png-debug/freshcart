import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * App-wide safety net. Any uncaught render error below this point shows a
 * branded recovery screen instead of a blank white page. A full reload is the
 * honest recovery action — it re-runs providers and route loading from a clean
 * slate. In development the error is surfaced to the console; production keeps
 * the console quiet (a real deployment would forward this to a monitoring
 * service such as Sentry at the marked point).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Uncaught error:', error, info.componentStack)
    }
    // Production hook: report(error, info) to a monitoring service here.
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center"
      >
        <span aria-hidden className="text-5xl">
          🥕
        </span>
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink">Something went wrong</h1>
          <p className="mt-1 max-w-sm text-sm text-muted">
            The app hit an unexpected snag. Reloading usually sorts it out — your cart and account
            are safe.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="h-11 rounded-field bg-primary px-6 text-sm font-bold text-on-primary shadow-card active:scale-95"
        >
          Reload FreshCart
        </button>
      </div>
    )
  }
}
