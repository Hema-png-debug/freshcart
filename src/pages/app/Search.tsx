import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search as SearchIcon, SearchX, X } from 'lucide-react'
import { ProductCard } from '../../components/catalog/ProductCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { fetchProducts } from '../../lib/catalog'
import { useCategoryNames } from '../../hooks/useCategoryNames'
import type { Product } from '../../types'

const DEBOUNCE_MS = 300

export function Search() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [term, setTerm] = useState('')
  const [retryTick, setRetryTick] = useState(0)
  const [results, setResults] = useState<Product[] | null>(null)
  const categoryNames = useCategoryNames()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced live search against Supabase; stale responses are discarded.
  useEffect(() => {
    const query = term.trim()
    if (query.length < 2) {
      setResults(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    let cancelled = false
    const t = window.setTimeout(() => {
      fetchProducts({ search: query, sort: 'popularity', limit: 30 }).then(
        (products) => {
          if (cancelled) return
          setResults(products)
          setLoading(false)
        },
        (err: unknown) => {
          if (cancelled) return
          setError(err instanceof Error ? err.message : 'Search failed.')
          setLoading(false)
        },
      )
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [term, retryTick])

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="relative flex-1">
          <SearchIcon
            size={17}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
          />
          <input
            ref={inputRef}
            type="search"
            role="searchbox"
            aria-label="Search products"
            placeholder="Search fruit, milk, snacks…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="h-12 w-full rounded-field border border-line bg-surface pl-10 pr-10 text-[0.9375rem] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm('')
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        {term.trim().length < 2 ? (
          <p className="px-1 text-sm text-muted">
            Type at least two letters to search the whole store.
          </p>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : error ? (
          <ErrorBanner message={error} onRetry={() => setRetryTick((t) => t + 1)} />
        ) : results && results.length === 0 ? (
          <EmptyState
            icon={<SearchX size={28} />}
            title={`No matches for “${term.trim()}”`}
            description="Check the spelling, or try something broader like “milk” or “apples”."
          />
        ) : results ? (
          <>
            <p className="mb-3 px-1 text-sm text-muted" role="status">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} categoryName={categoryNames[p.category_id]} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
