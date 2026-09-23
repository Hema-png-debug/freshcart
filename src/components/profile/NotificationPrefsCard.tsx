import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { Card } from '../ui/Card'
import { Toggle } from '../ui/Toggle'
import { useAuth } from '../../context/AuthContext'
import type { Profile } from '../../types'

type PrefKey = 'notify_orders' | 'notify_promos' | 'notify_announcements'

const PREFS: Array<{ key: PrefKey; label: string }> = [
  { key: 'notify_orders', label: 'Order updates' },
  { key: 'notify_promos', label: 'Promotions' },
  { key: 'notify_announcements', label: 'Announcements' },
]

/**
 * Per-user notification preferences. Optimistic: the switch flips instantly
 * and rolls back (with feedback) if the save fails. Server-side, the phase8
 * triggers and broadcast function consult these same columns.
 */
export function NotificationPrefsCard({
  onFeedback,
}: {
  onFeedback: (tone: 'success' | 'error', text: string) => void
}) {
  const { profile, updateProfile } = useAuth()
  const [overrides, setOverrides] = useState<Partial<Pick<Profile, PrefKey>>>({})

  const valueOf = (key: PrefKey) => overrides[key] ?? profile?.[key] ?? true

  const toggle = async (key: PrefKey, next: boolean) => {
    setOverrides((o) => ({ ...o, [key]: next }))
    const result = await updateProfile({ [key]: next })
    if (!result.ok) {
      setOverrides((o) => ({ ...o, [key]: !next }))
      onFeedback('error', result.message ?? 'Could not save that preference.')
    }
  }

  return (
    <Card>
      <div className="mb-1 flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
        >
          <BellRing size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">Notifications</p>
          <p className="text-sm text-muted">Choose what lands in your inbox</p>
        </div>
      </div>
      <div className="divide-y divide-line/60">
        {PREFS.map(({ key, label }) => (
          <Toggle
            key={key}
            label={label}
            checked={valueOf(key)}
            onToggle={(next) => void toggle(key, next)}
          />
        ))}
      </div>
    </Card>
  )
}
