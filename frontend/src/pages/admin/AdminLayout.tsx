import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import {
  BuildingOfficeIcon,
  UserCircleIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

interface NavItem {
  id: string
  label: string
  href: string
  icon: typeof BuildingOfficeIcon
  end?: boolean
  adminOnly: boolean
}

const navItems: NavItem[] = [
  { id: 'organization', label: 'Organization', href: '/settings', icon: BuildingOfficeIcon, end: true, adminOnly: true },
  { id: 'account', label: 'Account', href: '/settings/account', icon: UserCircleIcon, adminOnly: false },
  { id: 'plan', label: 'Plan & Usage', href: '/settings/plan', icon: CreditCardIcon, adminOnly: true },
  { id: 'general', label: 'General', href: '/settings/general', icon: Cog6ToothIcon, adminOnly: false },
]

const NON_ADMIN_PATHS = [
  '/settings/account',
  '/settings/profile',
  '/settings/my-activity',
  '/settings/general',
  '/settings/appearance',
  '/settings/security',
  '/settings/privacy',
  '/settings/terms',
]

export function SettingsLayout() {
  const { isAdmin, logout } = useAuth()
  const { success } = useToast()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    success('Logged out', 'You have been signed out successfully')
  }

  // Non-admins only have the account and general pages — bounce any admin-only route there.
  if (!isAdmin && !NON_ADMIN_PATHS.includes(location.pathname)) {
    return <Navigate to="/settings/account" replace />
  }

  const visibleNavItems = navItems.filter((item) => isAdmin || !item.adminOnly)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header matching Rooms.tsx */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-dark-300 mt-1 text-sm">
            Manage your workspace organization, personal account, subscriptions, and system preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-dark-900 hover:bg-rose-500/10 border border-dark-700 hover:border-rose-500/30 text-xs font-semibold text-dark-300 hover:text-rose-400 transition-all cursor-pointer shadow-xs"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 stroke-[2]" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Segment Control matching Rooms.tsx lines 194-228 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="flex items-center p-1 bg-dark-900 border border-dark-700 rounded-xl">
          {visibleNavItems.map((item) => {
            const isTabActive = (isActive: boolean) =>
              isActive || (item.id === 'organization' && location.pathname === '/settings/activity')

            return (
              <NavLink
                key={item.id}
                to={item.href}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    isTabActive(isActive)
                      ? 'bg-dark-800 text-foreground shadow-sm'
                      : 'text-dark-400 hover:text-foreground hover:bg-dark-800/40'
                  }`
                }
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0 stroke-[2]" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Full-width content canvas */}
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  )
}
