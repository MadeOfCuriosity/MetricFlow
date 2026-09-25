import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui/Spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ACTIVE_PLAN_STATUSES = ['active', 'authenticated', 'trialing']

// Routes that must stay accessible regardless of subscription status
// (so an unsubscribed user can pay and so admins can manage their org).
const SUBSCRIPTION_EXEMPT_PATHS = ['/subscription', '/settings', '/privacy']

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, organization } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" state={{ from: location }} replace />
  }

  // Subscription gate — block app access if the org doesn't have an active plan,
  // except for the subscription page itself (and a few always-allowed routes).
  const isExempt = SUBSCRIPTION_EXEMPT_PATHS.some((p) =>
    location.pathname === p || location.pathname.startsWith(p + '/')
  )
  const hasActivePlan = !!(
    organization?.plan_status &&
    ACTIVE_PLAN_STATUSES.includes(organization.plan_status)
  )
  if (!isExempt && !hasActivePlan) {
    return <Navigate to="/subscription" state={{ from: location }} replace />
  }

  return <>{children}</>
}
