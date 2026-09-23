import { useEffect, useState, type FormEvent } from 'react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import type { Category } from '../../types'
import type { CategoryInput } from '../../lib/adminService'

/** Create/edit category form (name, emoji "image", colour, tagline). */
export function CategoryFormSheet({
  open,
  onClose,
  category,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  category: Category | null
  onSubmit: (input: CategoryInput) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [color, setColor] = useState('#157347')
  const [tagline, setTagline] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setEmoji(category?.emoji ?? '')
    setColor(category?.color ?? '#157347')
    setTagline(category?.tagline ?? '')
    setError(null)
  }, [open, category])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !emoji.trim()) {
      setError('Name and emoji are required.')
      return
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      setError('Colour must be a hex value like #157347.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({ name, emoji, color, tagline })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={category ? 'Edit category' : 'New category'}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Emoji (category image)"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🥑"
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
        <Input
          label="Tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Fresh from the coast"
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={saving}>
          {category ? 'Save changes' : 'Create category'}
        </Button>
      </form>
    </Sheet>
  )
}
