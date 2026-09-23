import type { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes default padding when you need edge-to-edge content. */
  flush?: boolean
  /** Renders with a subtle border instead of a shadow. */
  outlined?: boolean
}

/** Base surface for grouped content — the produce crate of the design system. */
export function Card({ flush = false, outlined = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={[
        'rounded-card bg-surface',
        outlined ? 'border border-line' : 'shadow-card',
        flush ? '' : 'p-4 sm:p-5',
        className,
      ].join(' ')}
      {...rest}
    />
  )
}
