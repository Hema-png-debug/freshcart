import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpDown,
  PackageSearch,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { ProductCard } from '../../components/catalog/ProductCard'
import { SortSheet, SORT_OPTIONS } from '../../components/catalog/SortSheet'
import {
  FilterSheet,
  EMPTY_FILTERS,
  countActiveFilters,
  type ProductFilters,
} from '../../components/catalog/FilterSheet'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAsync } from '../../hooks/useAsync'
import { useDebounce } from '../../hooks/useDebounce'
import {
  fetchCategories,
  fetchCategoryBrands,
  fetchProducts,
  type ProductSort,
} from '../../lib/catalog'

const SEARCH_DEBOUNCE_MS = 300

/** A single category's shopping screen: banner, search, sort, filters, grid. */
export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [term, setTerm] = useState('')
  const [sort, setSort] = useState<ProductSort>('popularity')
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS)
  const [sortOpen, setSortOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const debouncedTerm = useDebounce(term.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedMin = useDebounce(filters.priceMin, SEARCH_DEBOUNCE_MS)
  const debouncedMax = useDebounce(filters.priceMax, SEARCH_DEBOUNCE_MS)

  // Category comes from the cached categories list — no extra query.
  const category = useAsync(
    useCallback(async () => {
      const all = await fetchCategories()
      return all.find((c) => c.slug === slug) ?? null
    }, [slug]),
    [slug],
  )
  const categoryId = category.data?.id

  // Total available products in the aisle (independent of active filters).
  const total = useAsync(
    useCallback(
      () =>
        categoryId
          ? fetchProducts({ categoryId, includeOutOfStock: true })
          : Promise.resolve([]),
      [categoryId],
    ),
    [categoryId],
  )

  const brands = useAsync(
    useCallback(
      () => (categoryId ? fetchCategoryBrands(categoryId) : Promise.resolve([])),
      [categoryId],
    ),
    [categoryId],
  )

  // The filtered grid. useAsync discards stale responses, so a slow earlier
  // query can never overwrite a newer one.
  const products = useAsync(
    useCallback(() => {
      if (!categoryId) return Promise.resolve([])
      return fetchProducts({
        categoryId,
        sort,
        search: debouncedTerm.length >= 2 ? debouncedTerm : undefined,
        includeOutOfStock: !filters.inStockOnly,
        brands: filters.brands.length > 0 ? filters.brands : undefined,
        priceMin: debouncedMin,
        priceMax: debouncedMax,
        organic: filters.organic || undefined,
        discounted: filters.discounted || undefined,
        isNew: filters.isNew || undefined,
        featured: filters.featured || undefined,
      })
    }, [
      categoryId,
      sort,
      debouncedTerm,
      filters.inStockOnly,
      filters.brands,
      debouncedMin,
      debouncedMax,
      filters.organic,
      filters.discounted,
      filters.isNew,
      filters.featured,
    ]),
    [categoryId, sort, debouncedTerm, filters, debouncedMin, debouncedMax],
  )

  const activeFilterCount = countActiveFilters(filters)
  const sortLabel = useMemo(
    () => SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort',
    [sort],
  )
  const isFiltering =
    activeFilterCount > 0 || debouncedTerm.length >= 2 || term.trim().length >= 2

  if (!category.loading && !category.error && category.data === null) {
    return (
      <EmptyState
        icon={<PackageSearch size={28} />}
        title="Category not found"
        description="This aisle doesn't exist. Let's get you back to browsing."
        actionLabel="All categories"
        onAction={() => navigate('/categories')}
      />
    )
  }

  return (
    <>
      {/* Banner */}
      {category.loading ? (
        <Skeleton className="h-32 w-full" />
      ) : category.error ? (
        <ErrorBanner message="Couldn't load this category." onRetry={category.reload} />
      ) : category.data ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-card p-5 text-white shadow-card"
          style={{ backgroundColor: category.data.color }}
        >
          <span aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15" />
          <span aria-hidden className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/10" />
          <span
            aria-hidden
            className="absolute bottom-2 right-3 text-6xl opacity-90 drop-shadow-sm"
          >
            {category.data.emoji}
          </span>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm"
          >
            <ArrowLeft size={17} />
          </button>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {category.data.name}
          </h1>
          <p className="mt-0.5 text-sm font-medium opacity-90">{category.data.tagline}</p>
          <p className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
            {total.data === null ? '…' : `${total.data.length} products available`}
          </p>
        </motion.div>
      ) : null}

      {/* Search within category */}
      <div className="relative mt-4">
        <SearchIcon
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
        />
        <input
          type="search"
          role="searchbox"
          aria-label={`Search in ${category.data?.name ?? 'this category'}`}
          placeholder={`Search ${category.data?.name.toLowerCase() ?? 'this aisle'}…`}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="h-11 w-full rounded-field border border-line bg-surface pl-9 pr-10 text-[0.9375rem] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink"
          >
            <X size={15} aria-hidden />
          </button>
        )}
      </div>

      {/* Sort + filter controls */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-field border border-line bg-surface text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <ArrowUpDown size={15} aria-hidden className="text-primary" />
          {sortLabel}
        </button>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
          className="relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-field border border-line bg-surface text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <SlidersHorizontal size={15} aria-hidden className="text-primary" />
          Filter
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-[0.6875rem] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Product grid */}
      <div className="mt-4">
        {products.loading || category.loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : products.error ? (
          <ErrorBanner message="Couldn't load products." onRetry={products.reload} />
        ) : (products.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<PackageSearch size={28} />}
            title={isFiltering ? 'No products match' : 'Nothing in this aisle yet'}
            description={
              isFiltering
                ? 'Try loosening the filters or a different search term.'
                : 'Products will appear here as soon as they arrive.'
            }
            actionLabel={activeFilterCount > 0 ? 'Clear filters' : undefined}
            onAction={activeFilterCount > 0 ? () => setFilters(EMPTY_FILTERS) : undefined}
          />
        ) : (
          <ul
            aria-label={`Products in ${category.data?.name ?? 'category'}`}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {products.data!.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25, ease: 'easeOut' }}
                className="[content-visibility:auto]"
              >
                <ProductCard product={p} categoryName={category.data?.name} />
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} value={sort} onChange={setSort} />
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        brands={brands.data ?? []}
      />
    </>
  )
}
