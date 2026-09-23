import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from './PageHeader'

/**
 * Page header with a back link. Extracted in the Phase 7 architecture review
 * from the identical construct in Checkout, OrderDetail, and Favourites.
 */
export const BackHeader = memo(function BackHeader({
  to,
  backLabel,
  title,
  subtitle,
}: {
  to: string
  backLabel: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <Link
        to={to}
        aria-label={backLabel}
        className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeft size={18} aria-hidden />
      </Link>
      <PageHeader title={title} subtitle={subtitle} />
    </div>
  )
})
