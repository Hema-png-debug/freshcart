import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../context/AuthContext'
import { isValidEmail } from '../../lib/validation'

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth()

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSentMessage('')

    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setEmailError('')

    setSubmitting(true)
    const result = await requestPasswordReset(email.trim())
    setSubmitting(false)

    if (!result.ok) {
      setFormError(result.message ?? 'Could not send the reset email. Try again.')
      return
    }
    setSentMessage(result.message ?? 'Reset link sent.')
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send you a reset link."
      backTo="/login"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        {sentMessage && <Alert tone="success">{sentMessage}</Alert>}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          leftIcon={<Mail size={17} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Send reset link
        </Button>

        <p className="text-center text-sm text-muted">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
