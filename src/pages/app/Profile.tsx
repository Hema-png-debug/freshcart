import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Heart, LogOut, Pencil, ShieldCheck, X } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../context/AuthContext'
import { useFavourites } from '../../context/FavouritesContext'
import { AddressCard } from '../../components/profile/AddressCard'
import { AppearanceCard } from '../../components/profile/AppearanceCard'
import { SecurityCard } from '../../components/profile/SecurityCard'
import { DangerZone } from '../../components/profile/DangerZone'
import { NotificationPrefsCard } from '../../components/profile/NotificationPrefsCard'
import { useNotifications } from '../../context/NotificationsContext'

export function Profile() {
  const { user, profile, signOut, updateProfile, isAdmin } = useAuth()
  const { ids: favouriteIds } = useFavourites()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  const displayName =
    profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? 'FreshCart shopper'
  const initial = displayName.charAt(0).toUpperCase()

  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [phoneDraft, setPhoneDraft] = useState(profile?.phone ?? '')
  const [nameError, setNameError] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Keep the drafts in sync when the profile row loads/updates.
  useEffect(() => {
    if (!editing) {
      setNameDraft(displayName)
      setPhoneDraft(profile?.phone ?? '')
    }
  }, [displayName, profile?.phone, editing])

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    if (nameDraft.trim().length < 2) {
      setNameError('Enter your name.')
      return
    }
    setNameError('')
    setSaving(true)
    const result = await updateProfile({
      full_name: nameDraft.trim(),
      phone: phoneDraft.trim() || null,
    })
    setSaving(false)
    setFeedback(
      result.ok
        ? { tone: 'success', text: 'Details updated.' }
        : { tone: 'error', text: result.message ?? 'Could not save. Try again.' },
    )
    if (result.ok) setEditing(false)
  }

  async function handleSignOut() {
    setSigningOut(true)
    const result = await signOut()
    setSigningOut(false)
    if (result.ok) {
      navigate('/welcome', { replace: true })
    } else {
      setFeedback({ tone: 'error', text: result.message ?? 'Sign out failed. Try again.' })
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account and preferences" />

      {feedback && <div className="mb-4"><Alert tone={feedback.tone}>{feedback.text}</Alert></div>}

      <Card className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary font-display text-xl font-extrabold text-on-primary"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-ink">{displayName}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
          {profile?.phone && <p className="truncate text-sm text-muted">{profile.phone}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((v) => !v)
            setFeedback(null)
          }}
          aria-label={editing ? 'Cancel editing details' : 'Edit your details'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line"
        >
          {editing ? <X size={17} /> : <Pencil size={17} />}
        </button>
      </Card>

      {editing && (
        <Card className="mt-4">
          <form onSubmit={handleSaveName} noValidate className="flex flex-col gap-3">
            <Input
              label="Full name"
              autoComplete="name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              error={nameError}
            />
            <Input
              label="Phone (optional)"
              type="tel"
              autoComplete="tel"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="07123 456789"
            />
            <Button type="submit" loading={saving}>
              Save details
            </Button>
          </form>
        </Card>
      )}

      <div className="mt-4 flex flex-col gap-4">
        <AddressCard onFeedback={(tone, text) => setFeedback({ tone, text })} />

        <Link
          to="/favourites"
          className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card transition-transform duration-150 active:scale-[0.98]"
        >
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
          >
            <Heart size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Favourites</span>
            <span className="block text-sm text-muted">
              {favouriteIds.size === 0
                ? 'Nothing saved yet'
                : `${favouriteIds.size} saved ${favouriteIds.size === 1 ? 'item' : 'items'}`}
            </span>
          </span>
          <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />
        </Link>

        <Link
          to="/notifications"
          className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card transition-transform duration-150 active:scale-[0.98]"
        >
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
          >
            <Bell size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Notifications</span>
            <span className="block text-sm text-muted">
              {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread`}
            </span>
          </span>
          <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card transition-transform duration-150 active:scale-[0.98]"
          >
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
            >
              <ShieldCheck size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Admin dashboard</span>
              <span className="block text-sm text-muted">Manage the store</span>
            </span>
            <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />
          </Link>
        )}

        <AppearanceCard />
        <NotificationPrefsCard onFeedback={(tone, text) => setFeedback({ tone, text })} />
        <SecurityCard onFeedback={(tone, text) => setFeedback({ tone, text })} />
        <DangerZone onFeedback={(tone, text) => setFeedback({ tone, text })} />
      </div>

      <div className="mt-6">
        <Button
          variant="danger"
          fullWidth
          loading={signingOut}
          leftIcon={<LogOut size={17} />}
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>
    </>
  )
}
