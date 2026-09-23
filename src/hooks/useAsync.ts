import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Re-runs the fetch (used by retry buttons). */
  reload: () => void
}

/**
 * Tiny data-fetching hook: runs `fn` on mount and whenever `deps` change,
 * ignores stale responses, and exposes a manual reload.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const runIdRef = useRef(0)

  useEffect(() => {
    const runId = ++runIdRef.current
    setLoading(true)
    setError(null)
    fn().then(
      (result) => {
        if (runIdRef.current !== runId) return
        setData(result)
        setLoading(false)
      },
      (err: unknown) => {
        if (runIdRef.current !== runId) return
        setError(err instanceof Error ? err.message : 'Something went wrong.')
        setLoading(false)
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload }
}
