import { useState, type FormEvent } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Sheet } from '../ui/Sheet'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'

/**
 * Delivery address control: shows the saved address and opens a sheet to
 * edit it. Persists to the user's profile row in Supabase.
 */
export function AddressButton() {
  const { profile, updateProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [line, setLine] = useState('')
  const [lineError, setLineError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const hasAddress = Boolean(profile?.address_line)

  function openSheet() {
    setLabel(profile?.address_label ?? 'Home')
    setLine(profile?.address_line ?? '')
    setLineError('')
    setFormError('')
    setOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (line.trim().length < 5) {
      setLineError('Enter your full delivery address.')
      return
    }
    setLineError('')
    setSaving(true)
    const result = await updateProfile({
      address_label: label.trim() || 'Home',
      address_line: line.trim(),
    })
    setSaving(false)
    if (!result.ok) {
      setFormError(result.message ?? 'Could not save your address. Try again.')
      return
    }
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="flex min-w-0 items-center gap-1.5 text-left"
        aria-label={
          hasAddress
            ? `Delivery address: ${profile!.address_line}. Tap to change.`
            : 'Set your delivery address'
        }
      >
        <MapPin size={15} aria-hidden className="shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Deliver to
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-ink">
            <span className="max-w-44 truncate">
              {hasAddress ? profile!.address_line : 'Set your address'}
            </span>
            <ChevronDown size={14} aria-hidden className="shrink-0 text-muted" />
          </span>
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Delivery address">
        <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <Input
            label="Label"
            placeholder="Home, Work…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            label="Address"
            placeholder="12 Portobello Road, London W11 1AA"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            error={lineError}
            hint="Street, city and postcode"
          />
          <Button type="submit" size="lg" fullWidth loading={saving}>
            Save address
          </Button>
        </form>
      </Sheet>
    </>
  )
}
