import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Product } from '../../types'
import { ProductCard } from './ProductCard'
import { Skeleton } from '../ui/Skeleton'
import { ErrorBanner } from '../ui/ErrorBanner'

export interface ProductCarouselProps {
  title: string
  /** Destination of the "See all" link. */
  seeAllTo: string
  products: Product[] | null
  loading: boolean
  error: string | null
  onRetry: () => void
  /** Rendered when loaded successfully but there are no products. */
  emptyMessage?: string
  /** category_id -> name, so cards can show their category. */
  categoryNames?: Record<string, string>
}

/** Horizontal product rail with a heading and a working "See all" link. */
export const ProductCarousel = memo(function ProductCarousel({
  title,
  seeAllTo,
  products,
  loading,
  error,
  onRetry,
  emptyMessage,
  categoryNames,
}: ProductCarouselProps) {
  const isEmpty = !loading && !error && (products?.length ?? 0) === 0

  // Sections with nothing to show and no message collapse entirely.
  if (isEmpty && !emptyMessage) return null

  return (
    <section aria-label={title} className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        {!isEmpty && (
          <Link
            to={seeAllTo}
            className="flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
          >
            See all <ChevronRight size={15} aria-hidden />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-36 shrink-0 sm:w-40" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message="Couldn't load this section." onRetry={onRetry} />
      ) : isEmpty ? (
        <p className="rounded-card bg-surface-2 p-4 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
          {products!.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              fixedWidth
              categoryName={categoryNames?.[p.category_id]}
            />
          ))}
        </div>
      )}
    </section>
  )
})
