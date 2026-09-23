import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { Category } from '../../types'
import { Skeleton } from '../ui/Skeleton'
import { ErrorBanner } from '../ui/ErrorBanner'

export interface CategoryRailProps {
  categories: Category[] | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

/** Horizontal rail of category chips; each links to that category's products. */
export const CategoryRail = memo(function CategoryRail({ categories, loading, error, onRetry }: CategoryRailProps) {
  return (
    <section aria-label="Categories" className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Categories</h2>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-[4.5rem] shrink-0" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message="Couldn't load categories." onRetry={onRetry} />
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.slug}`}
              className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 transition-transform duration-150 active:scale-95"
            >
              <span
                aria-hidden
                className="grid h-14 w-14 place-items-center rounded-2xl text-2xl"
                style={{ backgroundColor: `${c.color}26` }}
              >
                {c.emoji}
              </span>
              <span className="line-clamp-2 text-center text-[0.6875rem] font-semibold leading-tight text-ink">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
})
