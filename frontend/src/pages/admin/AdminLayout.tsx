import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  FolderIcon,
  ArrowPathRoundedSquareIcon,
  Squares2X2Icon,
  ClockIcon,
  UserCircleIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BellIcon,
  SwatchIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

interface NavItem {
  id: string
  label: string
  href: string
  icon: typeof HomeIcon
  end?: boolean
  adminOnly: boolean
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [{ id: 'overview', label: 'Overview', href: '/settings', icon: HomeIcon, end: true, adminOnly: true }],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'rooms', label: 'Rooms', href: '/settings/rooms', icon: FolderIcon, adminOnly: true },
      { id: 'integrations', label: 'Integrations', href: '/settings/integrations', icon: ArrowPathRoundedSquareIcon, adminOnly: true },
      { id: 'apps', label: 'Apps', href: '/settings/apps', icon: Squares2X2Icon, adminOnly: true },
      { id: 'activity', label: 'Activity', href: '/settings/activity', icon: ClockIcon, adminOnly: true },
    ],
  },
  {
    label: 'Account & Org',
    items: [
      { id: 'profile', label: 'Profile', href: '/settings/profile', icon: UserCircleIcon, adminOnly: false },
      { id: 'users', label: 'Users', href: '/settings/users', icon: UsersIcon, adminOnly: true },
      { id: 'organization', label: 'Organization', href: '/settings/organization', icon: BuildingOfficeIcon, adminOnly: true },
      { id: 'notifications', label: 'Notifications', href: '/settings/notifications', icon: BellIcon, adminOnly: false },
      { id: 'appearance', label: 'Appearance', href: '/settings/appearance', icon: SwatchIcon, adminOnly: false },
      { id: 'security', label: 'Security', href: '/settings/security', icon: KeyIcon, adminOnly: false },
    ],
  },
]

const NON_ADMIN_PATHS = ['/settings/profile', '/settings/notifications', '/settings/appearance', '/settings/security']

export function SettingsLayout() {
  const { isAdmin, logout } = useAuth()
  const { success } = useToast()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    success('Logged out', 'You have been signed out successfully')
  }

  // Non-admins only have the account-level pages — bounce any admin-only route there.
  if (!isAdmin && !NON_ADMIN_PATHS.includes(location.pathname)) {
    return <Navigate to="/settings/profile" replace />
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-dark-300 mt-1 text-sm">
            Manage your organization workspace, team members, integrations, and preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Vertical nav */}
        <div className="lg:col-span-1">
          <nav className="bg-dark-900 border border-dark-700 rounded-2xl p-2 shadow-sm">
            {navGroups.map((group, groupIndex) => {
              const visibleItems = group.items.filter((item) => isAdmin || !item.adminOnly)
              if (visibleItems.length === 0) return null
              return (
                <div
                  key={groupIndex}
                  className={groupIndex > 0 ? 'mt-2 pt-2 border-t border-dark-800' : ''}
                >
                  {group.label && (
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.href}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-dark-800 text-foreground font-semibold shadow-sm border border-dark-700/60'
                              : 'text-dark-400 hover:text-foreground hover:bg-dark-800/50'
                          }`
                        }
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="mt-2 pt-2 border-t border-dark-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Content area */}
        <div className="lg:col-span-3">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
