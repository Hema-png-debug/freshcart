import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { CategoryFormSheet } from '../../components/admin/CategoryFormSheet'
import { ConfirmSheet } from '../../components/admin/ConfirmSheet'
import { useAsync } from '../../hooks/useAsync'
import {
  createCategory,
  deleteCategory,
  fetchAllProducts,
  moveCategory,
  updateCategory,
  type CategoryInput,
} from '../../lib/adminService'
import { fetchCategories } from '../../lib/catalog'
import type { Category } from '../../types'

/** Category management: create, edit, reorder, delete (empty aisles only). */
export function AdminCategories() {
  const categories = useAsync(fetchCategories, [])
  const products = useAsync(fetchAllProducts, [])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products.data ?? []) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1
    return counts
  }, [products.data])

  const sorted = useMemo(
    () => [...(categories.data ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [categories.data],
  )

  const run = async (action: () => Promise<void>) => {
    setActionError(null)
    try {
      await action()
      categories.reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'That change could not be saved.')
    }
  }

  const submitForm = async (input: CategoryInput) => {
    if (editing) await updateCategory(editing.id, input)
    else await createCategory(input)
    categories.reload()
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteCategory(deleting.id, productCounts[deleting.id] ?? 0)
      setDeleting(null)
      categories.reload()
    } catch (e) {
      setDeleting(null)
      setActionError(e instanceof Error ? e.message : 'Could not delete the category.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Categories" subtitle="Order here is the order shoppers see" />
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="mt-1 flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-on-primary shadow-card active:scale-95"
        >
          <Plus size={15} aria-hidden />
          New
        </button>
      </div>

      {actionError && (
        <p role="alert" className="mt-2 rounded-card bg-danger-soft p-3 text-sm font-medium text-danger">
          {actionError}
        </p>
      )}

      <div className="mt-3">
        {categories.loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : categories.error ? (
          <ErrorBanner message="Couldn't load categories." onRetry={categories.reload} />
        ) : (
          <ul aria-label="Categories" className="flex flex-col gap-2">
            {sorted.map((c, i) => {
              const count = productCounts[c.id] ?? 0
              return (
                <li key={c.id} className="flex items-center gap-2.5 rounded-card bg-surface p-3 shadow-card">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl"
                    style={{ backgroundColor: `${c.color}26` }}
                  >
                    {c.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{c.name}</p>
                    <p className="truncate text-xs text-muted">
                      {count} {count === 1 ? 'product' : 'products'}
                      {c.tagline ? ` · ${c.tagline}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => void run(() => moveCategory(sorted, c.id, 'up'))}
                      aria-label={`Move ${c.name} up`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line disabled:opacity-35"
                    >
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={i === sorted.length - 1}
                      onClick={() => void run(() => moveCategory(sorted, c.id, 'down'))}
                      aria-label={`Move ${c.name} down`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line disabled:opacity-35"
                    >
                      <ArrowDown size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(c)
                        setFormOpen(true)
                      }}
                      aria-label={`Edit ${c.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line"
                    >
                      <Pencil size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(c)}
                      aria-label={`Delete ${c.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <CategoryFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        category={editing}
        onSubmit={submitForm}
      />
      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'category'}?`}
        description={
          (productCounts[deleting?.id ?? ''] ?? 0) > 0
            ? `This aisle still has ${productCounts[deleting?.id ?? '']} products — move or delete them first.`
            : 'This aisle is empty and can be removed safely.'
        }
        confirmLabel="Delete category"
        onConfirm={() => void confirmDelete()}
        busy={busy}
      />
    </>
  )
}
