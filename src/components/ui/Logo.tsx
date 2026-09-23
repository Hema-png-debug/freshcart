export interface LogoProps {
  /** Pixel size of the square mark. */
  size?: number
  /** Show the "FreshCart" wordmark next to the mark. */
  withWordmark?: boolean
  className?: string
}

/**
 * Brand mark: a basket with a leaf sprouting out of it.
 * Drawn with currentColor-independent brand tokens so it adapts to theme.
 */
export function Logo({ size = 40, withWordmark = false, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label="FreshCart logo"
      >
        <rect width="48" height="48" rx="14" fill="var(--c-primary)" />
        {/* basket */}
        <path
          d="M12 22h24l-2.6 12.2a3 3 0 0 1-2.94 2.38H17.54a3 3 0 0 1-2.94-2.38L12 22Z"
          fill="var(--c-on-primary)"
        />
        <path
          d="M18.5 26.5v6M24 26.5v6M29.5 26.5v6"
          stroke="var(--c-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* leaf */}
        <path
          d="M24.5 21.5c-.4-5.4 2.8-9.6 8.9-10.4.5 6.3-3 10-8.9 10.4Z"
          fill="var(--c-accent)"
        />
        <path
          d="M24.6 21.4c1.6-3.4 4-5.6 6.6-6.9"
          stroke="var(--c-on-primary)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark && (
        <span className="font-display text-2xl font-extrabold tracking-tight text-ink">
          Fresh<span className="text-primary">Cart</span>
        </span>
      )}
    </span>
  )
}
