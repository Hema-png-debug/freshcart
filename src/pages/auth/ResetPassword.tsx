import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../context/AuthContext'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { passwordError } from '../../lib/validation'

/**
 * Destination of the email reset link. Supabase signs the user in via the
 * recovery token; this screen sets the new password.
 */
export function ResetPassword() {
  const { updatePassword, session, initializing } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    const next: typeof errors = {}
    const pwErr = passwordError(password)
    if (pwErr) next.password = pwErr
    if (confirm !== password) next.confirm = 'Passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)

    if (!result.ok) {
      setFormError(result.message ?? 'Could not update the password. Try again.')
      return
    }
    navigate('/home', { replace: true })
  }

  // The email link lands here with a recovery token in the URL; wait for the
  // client to finish exchanging it before deciding the link is invalid.
  if (initializing) return <LoadingScreen label="Verifying your link…" />

  if (!session) {
    return (
      <AuthLayout
        title="Link expired"
        subtitle="This reset link is no longer valid. Request a new one below."
        backTo="/login"
      >
        <Button size="lg" fullWidth onClick={() => navigate('/forgot-password')}>
          Request a new link
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it strong and memorable.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  )
}
