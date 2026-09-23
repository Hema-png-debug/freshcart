import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AuthResult, Profile } from '../types'

interface AuthContextValue {
  /** True until the initial getSession() call resolves. */
  initializing: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  /** Set when Supabase redirects back from a password-recovery email link. */
  passwordRecovery: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (fullName: string, email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
  requestPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (newPassword: string) => Promise<AuthResult>
  /** null while unknown; true only when admin_users contains this user. */
  isAdmin: boolean | null
  /** Permanently deletes the account via the delete-account Edge Function. */
  deleteAccount: () => Promise<AuthResult>
  updateProfile: (fields: Partial<Pick<Profile, 'full_name' | 'phone' | 'address_label' | 'address_line' | 'notify_orders' | 'notify_promos' | 'notify_announcements'>>) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: 'Supabase is not configured. Add your credentials to the .env file.',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    const [profileRes, adminRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle<Profile>(),
      supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle(),
    ])
    if (!profileRes.error && profileRes.data) setProfile(profileRes.data)
    // RLS only ever returns the caller's own membership row.
    setIsAdmin(Boolean(!adminRes.error && adminRes.data))
  }, [])

  useEffect(() => {
    if (!supabase) {
      setInitializing(false)
      return
    }

    let active = true
    let profileTimer: number | undefined

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) void fetchProfile(data.session.user.id)
      setInitializing(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') {
        setProfile(null)
    setIsAdmin(null)
        setPasswordRecovery(false)
      }
      if (newSession?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        // Deferred: calling supabase inside this callback can deadlock (supabase-js docs).
        const userId = newSession.user.id
        window.clearTimeout(profileTimer)
        profileTimer = window.setTimeout(() => void fetchProfile(userId), 0)
      }
    })

    return () => {
      active = false
      window.clearTimeout(profileTimer)
      sub.subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return NOT_CONFIGURED
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, message: error.message }
    setSession(data.session)
    return { ok: true }
  }, [])

  const signUp = useCallback(
    async (fullName: string, email: string, password: string): Promise<AuthResult> => {
      if (!supabase) return NOT_CONFIGURED
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) return { ok: false, message: error.message }
      // When email confirmation is enabled, no session is returned yet.
      if (!data.session) {
        return {
          ok: true,
          message: 'Check your inbox — confirm your email to finish creating your account.',
        }
      }
      setSession(data.session)
      return { ok: true }
    },
    [],
  )

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return NOT_CONFIGURED
    const { error } = await supabase.auth.signOut()
    if (error) return { ok: false, message: error.message }
    // Don't wait for the SIGNED_OUT event — guards must see this immediately.
    setSession(null)
    setProfile(null)
        setIsAdmin(null)
    setPasswordRecovery(false)
    return { ok: true }
  }, [])

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return NOT_CONFIGURED
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { ok: false, message: error.message }
    return {
      ok: true,
      message: 'If an account exists for that email, a reset link is on its way.',
    }
  }, [])

  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: 'Supabase is not configured.' }
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
      'delete-account',
      { body: {} },
    )
    if (error || !data?.ok) {
      return { ok: false, message: error?.message ?? data?.error ?? 'Could not delete the account.' }
    }
    // The auth user is gone; clear local session state. A remote sign-out may
    // legitimately fail now, so ignore its result.
    await supabase.auth.signOut().catch(() => {})
    setSession(null)
    setProfile(null)
        setIsAdmin(null)
    return { ok: true }
  }, [])

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) return NOT_CONFIGURED
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, message: error.message }
    setPasswordRecovery(false)
    return { ok: true, message: 'Password updated.' }
  }, [])

  const updateProfile = useCallback(
    async (fields: Partial<Pick<Profile, 'full_name' | 'phone' | 'address_label' | 'address_line' | 'notify_orders' | 'notify_promos' | 'notify_announcements'>>): Promise<AuthResult> => {
      if (!supabase) return NOT_CONFIGURED
      const userId = session?.user.id
      if (!userId) return { ok: false, message: 'You must be signed in.' }
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single<Profile>()
      if (error) return { ok: false, message: error.message }
      setProfile(data)
      return { ok: true, message: 'Profile updated.' }
    },
    [session],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      session,
      user: session?.user ?? null,
      profile,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      deleteAccount,
      isAdmin,
      updateProfile,
    }),
    [
      initializing,
      session,
      profile,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      deleteAccount,
      isAdmin,
      updateProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

