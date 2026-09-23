import { Spinner } from './Spinner'

/** Full-screen centered loader used while route data or auth state resolves. */
export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg text-muted">
      <Spinner size={28} className="text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
