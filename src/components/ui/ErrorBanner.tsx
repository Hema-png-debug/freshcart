import { memo } from 'react'

/**
 * Inline load-failure banner with a retry action. Extracted in the Phase 6
 * architecture review from the identical markup repeated across screens.
 */
export const ErrorBanner = memo(function ErrorBanner({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between rounded-card bg-danger-soft p-4 text-sm font-medium text-danger"
    >
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="font-bold underline">
        Retry
      </button>
    </div>
  )
})
