import { useEffect, useState, type FormEvent } from 'react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import type { Offer } from '../../types'
import { promotionInputError, type PromotionInput } from '../../lib/promotionService'
import { Checkbox } from '../ui/Checkbox'

/** Local datetime-local <-> ISO helpers (empty means an open-ended bound). */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function toIso(local: string): string | null {
  return local ? new Date(local).toISOString() : null
}

/** Create/edit promotion form in a bottom sheet. */
export function PromotionFormSheet({
  open,
  onClose,
  promotion,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  /** When present, the sheet edits this promotion; otherwise it creates one. */
  promotion: Offer | null
  onSubmit: (input: PromotionInput) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [percent, setPercent] = useState('10')
  const [color, setColor] = useState('#157347')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [featured, setFeatured] = useState(false)
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(promotion?.title ?? '')
    setDescription(promotion?.subtitle ?? '')
    setPercent(promotion ? String(promotion.discount_percent) : '10')
    setColor(promotion?.color ?? '#157347')
    setStartsAt(toLocalInput(promotion?.starts_at ?? null))
    setEndsAt(toLocalInput(promotion?.ends_at ?? null))
    setFeatured(promotion?.featured ?? false)
    setActive(promotion?.active ?? true)
    setError(null)
  }, [open, promotion])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const input: PromotionInput = {
      title,
      description,
      discount_percent: Number(percent),
      color,
      starts_at: toIso(startsAt),
      ends_at: toIso(endsAt),
      featured,
      active,
    }
    const validation = promotionInputError(input)
    if (validation) {
      setError(validation)
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the promotion.')
    } finally {
      setSaving(false)
    }
  }


  return (
    <Sheet open={open} onClose={onClose} title={promotion ? 'Edit promotion' : 'New promotion'}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pb-1"
      >
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Fresh Week"
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Up to 25% off fruit & veg"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Discount (%)"
            type="number"
            inputMode="numeric"
            min={1}
            max={90}
            step="1"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Banner colour</span>
            <div className="flex h-11 items-center gap-2 rounded-field border border-line bg-surface px-2">
              <input
                type="color"
                aria-label="Banner colour"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="text-sm text-muted">{color}</span>
            </div>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Starts (optional)"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <Input
            label="Ends (optional)"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink">Flags</legend>
          <Checkbox label="Featured" checked={featured} onChange={setFeatured} />
          <Checkbox label="Active" checked={active} onChange={setActive} />
        </fieldset>

        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={saving}>
          {promotion ? 'Save changes' : 'Create promotion'}
        </Button>
      </form>
    </Sheet>
  )
}
