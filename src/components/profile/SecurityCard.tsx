import { useState, type FormEvent } from 'react'
import { KeyRound, Pencil, X } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../context/AuthContext'
import { passwordError } from '../../lib/validation'

/** Change the account password using the same rules as registration. */
export function SecurityCard({
  onFeedback,
}: {
  onFeedback: (tone: 'success' | 'error', text: string) => void
}) {
  const { updatePassword } = useAuth()
  const [editing, setEditing] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [saving, setSaving] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const pwError = passwordError(password)
    const confirmError = password !== confirm ? "Passwords don't match." : undefined
    setErrors({ password: pwError, confirm: confirmError })
    if (pwError || confirmError) return

    setSaving(true)
    const result = await updatePassword(password)
    setSaving(false)
    if (result.ok) {
      setEditing(false)
      setPassword('')
      setConfirm('')
      onFeedback('success', 'Password updated.')
    } else {
      onFeedback('error', result.message ?? 'Could not update the password.')
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
        >
          <KeyRound size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Password</p>
          <p className="text-sm text-muted">Change your sign-in password</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((v) => !v)
            setErrors({})
            setPassword('')
            setConfirm('')
          }}
          aria-label={editing ? 'Cancel changing password' : 'Change password'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line"
        >
          {editing ? <X size={17} aria-hidden /> : <Pencil size={17} aria-hidden />}
        </button>
      </div>
      {editing && (
        <form onSubmit={handleSave} noValidate className="mt-4 flex flex-col gap-3">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />
          <Button type="submit" loading={saving}>
            Update password
          </Button>
        </form>
      )}
    </Card>
  )
}
