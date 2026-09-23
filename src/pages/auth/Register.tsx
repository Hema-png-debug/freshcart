import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, User } from 'lucide-react'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../context/AuthContext'
import { isValidEmail, passwordError } from '../../lib/validation'

interface FieldErrors {
  name?: string
  email?: string
  password?: string
  confirm?: string
}

export function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setInfoMessage('')

    const errors: FieldErrors = {}
    if (name.trim().length < 2) errors.name = 'Enter your name.'
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'
    const pwErr = passwordError(password)
    if (pwErr) errors.password = pwErr
    if (confirm !== password) errors.confirm = 'Passwords do not match.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    const result = await signUp(name.trim(), email.trim(), password)
    setSubmitting(false)

    if (!result.ok) {
      setFormError(result.message ?? 'Sign up failed. Try again.')
      return
    }
    if (result.message) {
      // Email confirmation is enabled on the project — no session yet.
      setInfoMessage(result.message)
      return
    }
    navigate('/home', { replace: true })
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Fresh groceries are a couple of taps away."
      backTo="/welcome"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        {infoMessage && <Alert tone="success">{infoMessage}</Alert>}

        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Alex Fresher"
          leftIcon={<User size={17} />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          leftIcon={<Mail size={17} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={fieldErrors.confirm}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-1">
          Create account
        </Button>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
