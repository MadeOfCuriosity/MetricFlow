import { NavLink, Outlet, Navigate } from 'react-router-dom'
import {
  HomeIcon,
  UsersIcon,
  FolderIcon,
  BuildingOfficeIcon,
  ArrowPathRoundedSquareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'

const adminTabs = [
  { name: 'Overview', href: '/admin', icon: HomeIcon, end: true },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Rooms', href: '/admin/rooms', icon: FolderIcon },
  { name: 'Organization', href: '/admin/organization', icon: BuildingOfficeIcon },
  { name: 'Integrations', href: '/admin/integrations', icon: ArrowPathRoundedSquareIcon },
  { name: 'Activity', href: '/admin/activity', icon: ClockIcon },
]

export function AdminLayout() {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-dark-300 mt-1">Manage your organization, users, and settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-dark-700">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {adminTabs.map((tab) => (
            <NavLink
              key={tab.name}
              to={tab.href}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-300 hover:text-foreground hover:border-dark-500'
                }`
              }
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Sub-page content */}
      <Outlet />
    </div>
  )
}
