import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useAsync } from '../../hooks/useAsync'
import { fetchCategories, fetchCategoryCounts } from '../../lib/catalog'

/** The Categories tab: every aisle in the store, with live product counts. */
export function Categories() {
  const categories = useAsync(fetchCategories, [])
  const counts = useAsync(fetchCategoryCounts, [])

  return (
    <>
      <PageHeader title="Categories" subtitle="Browse every aisle" />

      {categories.loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : categories.error ? (
        <ErrorBanner message="Couldn't load categories." onRetry={categories.reload} />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {(categories.data ?? []).map((c, i) => {
            const count = counts.data?.[c.id]
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25, ease: 'easeOut' }}
              >
                <Link
                  to={`/category/${c.slug}`}
                  className="group flex h-full items-center gap-3 rounded-card bg-surface p-3.5 shadow-card transition-transform duration-150 active:scale-[0.97]"
                >
                  <span
                    aria-hidden
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: `${c.color}26` }}
                  >
                    {c.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{c.name}</span>
                    <span className="block text-xs text-muted">
                      {count === undefined ? '…' : `${count} ${count === 1 ? 'product' : 'products'}`}
                    </span>
                  </span>
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />
                </Link>
              </motion.li>
            )
          })}
        </ul>
      )}
    </>
  )
}
