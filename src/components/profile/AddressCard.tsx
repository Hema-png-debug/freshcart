import { useState, type FormEvent } from 'react'
import { MapPin, Pencil, X } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../context/AuthContext'

/** Shows and edits the saved delivery address (same profile fields the Home
 * header and checkout use, so all three stay in sync). */
export function AddressCard({
  onFeedback,
}: {
  onFeedback: (tone: 'success' | 'error', text: string) => void
}) {
  const { profile, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(profile?.address_label ?? 'Home')
  const [line, setLine] = useState(profile?.address_line ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const hasAddress = Boolean(profile?.address_label && profile.address_line)

  const startEditing = () => {
    setLabel(profile?.address_label ?? 'Home')
    setLine(profile?.address_line ?? '')
    setError('')
    setEditing((v) => !v)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!line.trim()) {
      setError('Enter your address.')
      return
    }
    setError('')
    setSaving(true)
    const result = await updateProfile({
      address_label: label.trim() || 'Home',
      address_line: line.trim(),
    })
    setSaving(false)
    if (result.ok) {
      setEditing(false)
      onFeedback('success', 'Address updated.')
    } else {
      onFeedback('error', result.message ?? 'Could not save the address.')
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
        >
          <MapPin size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Delivery address</p>
          <p className="truncate text-sm text-muted">
            {hasAddress ? `${profile!.address_label} · ${profile!.address_line}` : 'Not set yet'}
          </p>
        </div>
        <button
          type="button"
          onClick={startEditing}
          aria-label={editing ? 'Cancel editing address' : 'Edit delivery address'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line"
        >
          {editing ? <X size={17} aria-hidden /> : <Pencil size={17} aria-hidden />}
        </button>
      </div>
      {editing && (
        <form onSubmit={handleSave} noValidate className="mt-4 flex flex-col gap-3">
          <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home" />
          <Input
            label="Address"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="12 Rosemary Lane, London"
            error={error}
          />
          <Button type="submit" loading={saving}>
            Save address
          </Button>
        </form>
      )}
    </Card>
  )
}
