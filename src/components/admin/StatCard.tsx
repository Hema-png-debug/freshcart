import { memo, type ReactNode } from 'react'

/** Compact metric tile for the overview grid. */
export const StatCard = memo(function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string
  value: string
  icon?: ReactNode
  tone?: 'default' | 'accent' | 'danger'
}) {
  const valueClass =
    tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent' : 'text-ink'
  return (
    <div className="rounded-card bg-surface p-3.5 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon}
        {label}
      </p>
      <p className={`mt-1 font-display text-xl font-extrabold ${valueClass}`}>{value}</p>
    </div>
  )
})
