import { Navigate, Outlet, useLocation } from 'react-router'
import { PageLoader } from '@/components'
import { redirectState } from './redirect'
import { useSession } from './session-store'

export function RequireAuth() {
  const session = useSession()
  const location = useLocation()

  switch (session.status) {
    case 'unknown':
      return <PageLoader label="Checking session…" />
    case 'anonymous':
      return <Navigate to="/login" replace state={redirectState(location)} />
    case 'authenticated':
      return <Outlet />
  }
}
