import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom'
import {
  ChartBarIcon,
  BuildingOffice2Icon,
  UsersIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  MegaphoneIcon,
  ClipboardDocumentListIcon,
  BuildingLibraryIcon,
  HeartIcon,
  InboxArrowDownIcon,
} from '@heroicons/react/24/outline'
import { superadminService, SuperAdmin } from '../../services/superadmin'
import { useTheme } from '../../context/ThemeContext'

const tabs = [
  { name: 'Insights', href: '/superadmin', icon: ChartBarIcon, end: true },
  { name: 'Organizations', href: '/superadmin/organizations', icon: BuildingOffice2Icon },
  { name: 'Users', href: '/superadmin/users', icon: UsersIcon },
  { name: 'Subscriptions', href: '/superadmin/subscriptions', icon: CreditCardIcon },
  { name: 'Leads', href: '/superadmin/leads', icon: InboxArrowDownIcon },
  { name: 'Industries', href: '/superadmin/industries', icon: BuildingLibraryIcon },
  { name: 'Campaigns', href: '/superadmin/campaigns', icon: MegaphoneIcon },
  { name: 'Audit Log', href: '/superadmin/audit-log', icon: ClipboardDocumentListIcon },
  { name: 'Health', href: '/superadmin/health', icon: HeartIcon },
  { name: 'Admins', href: '/superadmin/admins', icon: ShieldCheckIcon },
]

export function SuperAdminLayout() {
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const [admin, setAdmin] = useState<SuperAdmin | null>(superadminService.getStoredAdmin())
  const [loading, setLoading] = useState(!admin)

  useEffect(() => {
    if (!superadminService.isAuthenticated()) return
    superadminService
      .me()
      .then((a) => {
        setAdmin(a)
        superadminService.setStoredAdmin(a)
      })
      .catch(() => {
        superadminService.logout()
        navigate('/superadmin/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

  if (!superadminService.isAuthenticated()) {
    return <Navigate to="/superadmin/login" replace />
  }

  const handleLogout = () => {
    superadminService.logout()
    navigate('/superadmin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="border-b border-dark-700 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={resolvedTheme === 'light' ? '/visualise_dark.png' : '/visualise.png'}
                alt="Visualize"
                className="w-6 h-6"
              />
              <div>
                <div className="text-sm font-semibold text-foreground">Visualize</div>
                <div className="text-xs text-primary-400 -mt-0.5">Platform Admin</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {admin && (
                <div className="flex items-center gap-2 text-sm text-dark-200">
                  {admin.picture && (
                    <img src={admin.picture} alt="" className="w-7 h-7 rounded-full" />
                  )}
                  <div className="hidden sm:flex flex-col leading-tight">
                    <span className="font-medium text-foreground">{admin.name || admin.email}</span>
                    <span className="text-xs text-dark-400">{admin.email}</span>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-dark-200 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex gap-6 border-b border-dark-700 overflow-x-auto">
          {tabs.map((t) => (
            <NavLink
              key={t.name}
              to={t.href}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-300 hover:text-foreground hover:border-dark-500'
                }`
              }
            >
              <t.icon className="h-4 w-4" />
              {t.name}
            </NavLink>
          ))}
        </nav>

        <main className="py-6">
          {loading && !admin ? (
            <div className="text-dark-300 text-sm">Loading…</div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
