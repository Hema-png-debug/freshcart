import type { ReactNode } from 'react'

/**
 * Labelled admin select. Extracted in the Phase 8B review from identical
 * copies in AdminProducts/AdminOrders (filter variant) and the form variant
 * in AdminNotifications; the promotions form is its fourth consumer.
 */
export function AdminSelect({
  label,
  value,
  onChange,
  variant = 'filter',
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  variant?: 'filter' | 'form'
  children: ReactNode
}) {
  const selectClass =
    variant === 'filter'
      ? 'h-10 rounded-field border border-line bg-surface px-2.5 text-sm font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60'
      : 'h-11 w-full rounded-field border border-line bg-surface px-3 text-[0.9375rem] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60'

  if (variant === 'form') {
    return (
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
          {children}
        </select>
      </label>
    )
  }
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
    </label>
  )
}
