import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Button } from './Button'

export interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

/** Friendly empty state used across tabs; an empty screen is an invitation to act. */
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary" aria-hidden>
        {icon}
      </div>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}
