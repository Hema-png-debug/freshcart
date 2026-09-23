import { useMemo, useState } from 'react'
import { Pencil, Plus, Search as SearchIcon, Trash2 } from 'lucide-react'
import { AdminSearch } from '../../components/admin/AdminSearch'
import { AdminSelect } from '../../components/admin/AdminSelect'
import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ProductFormSheet } from '../../components/admin/ProductFormSheet'
import { ConfirmSheet } from '../../components/admin/ConfirmSheet'
import { useAsync } from '../../hooks/useAsync'
import { useDebounce } from '../../hooks/useDebounce'
import {
  createProduct,
  deleteProduct,
  fetchAllProducts,
  updateProduct,
  type ProductInput,
} from '../../lib/adminService'
import { fetchCategories } from '../../lib/catalog'
import { formatPrice } from '../../lib/format'
import type { Product } from '../../types'

type StockFilter = 'all' | 'in' | 'out'
type AdminSort = 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'best_selling'

/** Product management: search, filter, sort, add, edit, delete. */
export function AdminProducts() {
  const products = useAsync(fetchAllProducts, [])
  const categories = useAsync(fetchCategories, [])

  const [term, setTerm] = useState('')
  const debouncedTerm = useDebounce(term.trim().toLowerCase(), 200)
  const [categoryId, setCategoryId] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sort, setSort] = useState<AdminSort>('name')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const visible = useMemo(() => {
    let list = products.data ?? []
    if (debouncedTerm) {
      list = list.filter((p) =>
        [p.name, p.brand, p.description].some((f) => f.toLowerCase().includes(debouncedTerm)),
      )
    }
    if (categoryId !== 'all') list = list.filter((p) => p.category_id === categoryId)
    if (stockFilter === 'in') list = list.filter((p) => p.in_stock)
    if (stockFilter === 'out') list = list.filter((p) => !p.in_stock)
    const sorted = [...list]
    switch (sort) {
      case 'price_asc':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'stock_asc':
        sorted.sort((a, b) => a.stock_quantity - b.stock_quantity)
        break
      case 'best_selling':
        sorted.sort((a, b) => b.units_sold - a.units_sold)
        break
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [products.data, debouncedTerm, categoryId, stockFilter, sort])

  const categoryName = useMemo(
    () => Object.fromEntries((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  )

  const submitForm = async (input: ProductInput) => {
    if (editing) await updateProduct(editing.id, input)
    else await createProduct(input)
    products.reload()
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteProduct(deleting.id)
      setDeleting(null)
      products.reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete the product.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Products" subtitle={`${products.data?.length ?? 0} in the catalogue`} />
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="mt-1 flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-on-primary shadow-card active:scale-95"
        >
          <Plus size={15} aria-hidden />
          Add product
        </button>
      </div>

      <AdminSearch label="Search products" placeholder="Search name, brand, description…" value={term} onChange={setTerm} />

      <div className="mt-2 flex flex-wrap gap-2">
        <AdminSelect label="Category" value={categoryId} onChange={setCategoryId}>
          <option value="all">All</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </AdminSelect>
        <AdminSelect
          label="Stock"
          value={stockFilter}
          onChange={(v) => setStockFilter(v as StockFilter)}
        >
          <option value="all">All</option>
          <option value="in">Available</option>
          <option value="out">Unavailable</option>
        </AdminSelect>
        <AdminSelect label="Sort" value={sort} onChange={(v) => setSort(v as AdminSort)}>
          <option value="name">Name</option>
          <option value="price_asc">Price (low first)</option>
          <option value="price_desc">Price (high first)</option>
          <option value="stock_asc">Stock (low first)</option>
          <option value="best_selling">Best selling</option>
        </AdminSelect>
      </div>

      {actionError && (
        <p role="alert" className="mt-3 rounded-card bg-danger-soft p-3 text-sm font-medium text-danger">
          {actionError}
        </p>
      )}

      <div className="mt-4">
        {products.loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : products.error ? (
          <ErrorBanner message="Couldn't load products." onRetry={products.reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={28} />}
            title="No products match"
            description="Try a different search or filter."
          />
        ) : (
          <ul aria-label="Products" className="flex flex-col gap-2">
            {visible.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card">
                <span aria-hidden className={`text-2xl ${p.in_stock ? '' : 'opacity-40 grayscale'}`}>
                  {p.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                  <p className="truncate text-xs text-muted">
                    {categoryName[p.category_id] ?? '—'} · {p.brand} · {formatPrice(p.price)} ·{' '}
                    {p.in_stock ? `${p.stock_quantity} in stock` : 'unavailable'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(p)
                    setFormOpen(true)
                  }}
                  aria-label={`Edit ${p.name}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line"
                >
                  <Pencil size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(p)}
                  aria-label={`Delete ${p.name}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProductFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        categories={categories.data ?? []}
        product={editing}
        onSubmit={submitForm}
      />
      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'product'}?`}
        description="Shoppers will no longer see this product. Past orders keep their snapshots."
        confirmLabel="Delete product"
        onConfirm={() => void confirmDelete()}
        busy={busy}
      />
    </>
  )
}
