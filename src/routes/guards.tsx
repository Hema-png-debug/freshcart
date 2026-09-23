import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from '../components/ui/LoadingScreen'

/** Wraps routes that require a signed-in user. */
export function RequireAuth() {
  const { initializing, session } = useAuth()
  const location = useLocation()
  if (initializing) return <LoadingScreen />
  if (!session) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Wraps auth screens: signed-in users are sent to the app instead. */
export function RedirectIfAuthed() {
  const { initializing, session, passwordRecovery } = useAuth()
  if (initializing) return <LoadingScreen />
  // Recovery links create a session — let the user reach the reset screen.
  if (session && !passwordRecovery) return <Navigate to="/home" replace />
  return <Outlet />
}
