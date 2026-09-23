import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LoadingScreen } from '../ui/LoadingScreen'
import { NotFound } from '../../pages/NotFound'

/**
 * Admin route guard. Unauthenticated users go to login; authenticated
 * non-admins see the ordinary 404 — the dashboard's existence is not
 * revealed. This is UX only: the real boundary is the is_admin() RLS.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, initializing, isAdmin } = useAuth()

  if (initializing || (session && isAdmin === null)) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <NotFound />
  return <>{children}</>
}
