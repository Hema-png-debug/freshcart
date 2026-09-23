import { useState } from 'react'
import { CalendarRange, Pencil, Plus, Star, Tag, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { PromotionFormSheet } from '../../components/admin/PromotionFormSheet'
import { ConfirmSheet } from '../../components/admin/ConfirmSheet'
import { useAsync } from '../../hooks/useAsync'
import {
  createPromotion,
  deletePromotion,
  fetchAllPromotions,
  promotionState,
  setPromotionActive,
  updatePromotion,
  type PromotionInput,
  type PromotionState,
} from '../../lib/promotionService'
import { formatDate } from '../../lib/format'
import type { Offer } from '../../types'

const STATE_STYLES: Record<PromotionState, { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-primary-soft text-primary' },
  scheduled: { label: 'Scheduled', className: 'bg-accent/15 text-accent' },
  expired: { label: 'Expired', className: 'bg-surface-2 text-muted' },
  inactive: { label: 'Inactive', className: 'bg-surface-2 text-muted' },
}

function windowLabel(p: Offer): string {
  if (p.starts_at && p.ends_at) return `${formatDate(p.starts_at)} – ${formatDate(p.ends_at)}`
  if (p.starts_at) return `From ${formatDate(p.starts_at)}`
  if (p.ends_at) return `Until ${formatDate(p.ends_at)}`
  return 'Always on'
}

/** Promotion management: create, edit, schedule, feature, (de)activate, delete. */
export function AdminPromotions() {
  const promotions = useAsync(fetchAllPromotions, [])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Offer | null>(null)
  const [deleting, setDeleting] = useState<Offer | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const submitForm = async (input: PromotionInput) => {
    if (editing) await updatePromotion(editing.id, input)
    else await createPromotion(input)
    promotions.reload()
  }

  const toggleActive = async (p: Offer) => {
    setPendingId(p.id)
    setActionError(null)
    try {
      await setPromotionActive(p.id, !p.active)
      promotions.reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update the promotion.')
    } finally {
      setPendingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setActionError(null)
    try {
      await deletePromotion(deleting.id)
      setDeleting(null)
      promotions.reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete the promotion.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Promotions" subtitle="What shoppers see on the Home banners" />
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
        {promotions.loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : promotions.error ? (
          <ErrorBanner message="Couldn't load promotions." onRetry={promotions.reload} />
        ) : (promotions.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Tag size={28} />}
            title="No promotions yet"
            description="Create one and it appears on the Home banners while it's live."
          />
        ) : (
          <ul aria-label="Promotions" className="flex flex-col gap-2">
            {promotions.data!.map((p) => {
              const state = promotionState(p)
              const style = STATE_STYLES[state]
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    <Tag size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
                      <span className="truncate">{p.title}</span>
                      {p.featured && (
                        <Star
                          size={13}
                          aria-label="Featured promotion"
                          className="shrink-0 fill-accent text-accent"
                        />
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.className}`}>
                        {style.label}
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                      <CalendarRange size={12} aria-hidden className="shrink-0" />
                      {windowLabel(p)} · −{p.discount_percent}%
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={pendingId === p.id}
                      onClick={() => void toggleActive(p)}
                      aria-label={`${p.active ? 'Deactivate' : 'Activate'} ${p.title}`}
                      className={`h-8 rounded-full px-2.5 text-xs font-bold transition-colors disabled:opacity-35 ${
                        p.active
                          ? 'bg-primary-soft text-primary hover:bg-line'
                          : 'bg-surface-2 text-muted hover:bg-line'
                      }`}
                    >
                      {p.active ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p)
                        setFormOpen(true)
                      }}
                      aria-label={`Edit ${p.title}`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line"
                    >
                      <Pencil size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      aria-label={`Delete ${p.title}`}
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

      <PromotionFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        promotion={editing}
        onSubmit={submitForm}
      />
      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.title ?? 'promotion'}?`}
        description="The banner disappears for shoppers; products attached to it simply lose the campaign badge — nothing else is removed."
        confirmLabel="Delete promotion"
        onConfirm={() => void confirmDelete()}
        busy={busy}
      />
    </>
  )
}
