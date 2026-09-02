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
    label: 'General',
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-dark-300 mt-1">Manage your organization, users, and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Vertical nav */}
        <div className="lg:col-span-1">
          <nav className="bg-dark-900 border border-dark-700 rounded-xl p-2">
            {navGroups.map((group, groupIndex) => {
              const visibleItems = group.items.filter((item) => isAdmin || !item.adminOnly)
              if (visibleItems.length === 0) return null
              return (
                <div
                  key={groupIndex}
                  className={groupIndex > 0 ? 'mt-3 pt-3 border-t border-dark-700' : ''}
                >
                  {group.label && (
                    <div className="px-3 pb-1 text-xs font-semibold text-dark-500 uppercase tracking-wider">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.href}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium border-l-2 transition-colors ${
                            isActive
                              ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                              : 'border-transparent text-dark-300 hover:bg-dark-800 hover:text-foreground'
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="mt-3 pt-3 border-t border-dark-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium border-l-2 border-transparent text-danger-400 hover:bg-danger-500/10 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
                Sign Out
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
