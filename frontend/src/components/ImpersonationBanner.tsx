import { useNavigate } from 'react-router-dom'
import { ExclamationTriangleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import {
  isImpersonating,
  getImpersonationMeta,
  endImpersonation,
} from '../services/impersonation'

export function ImpersonationBanner() {
  const navigate = useNavigate()
  if (!isImpersonating()) return null
  const meta = getImpersonationMeta()

  const handleExit = () => {
    endImpersonation()
    navigate('/superadmin', { replace: true })
    // Hard reload so any cached AuthContext state is cleared
    setTimeout(() => window.location.reload(), 50)
  }

  return (
    <div className="sticky top-0 z-40 bg-warning-500 text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-2 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium truncate">
              Impersonating {meta?.user_email ?? 'user'}
              {meta?.org_name ? ` (${meta.org_name})` : ''}
              {meta?.superadmin_email ? ` as ${meta.superadmin_email}` : ''}
            </span>
          </div>
          <button
            onClick={handleExit}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 bg-black/10 hover:bg-black/20 rounded font-medium"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Exit impersonation
          </button>
        </div>
      </div>
    </div>
  )
}
