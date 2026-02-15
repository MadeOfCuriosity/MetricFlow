import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { useNavigate } from 'react-router-dom'
import {
  Bars3Icon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  BellIcon,
  SwatchIcon,
  KeyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  onMenuClick?: () => void
}

const settingsLinks = [
  { tab: 'profile', label: 'Profile', icon: UserCircleIcon },
  { tab: 'organization', label: 'Organization', icon: BuildingOfficeIcon },
  { tab: 'notifications', label: 'Notifications', icon: BellIcon },
  { tab: 'appearance', label: 'Appearance', icon: SwatchIcon },
  { tab: 'security', label: 'Security', icon: KeyIcon },
]

export function Header({ onMenuClick }: HeaderProps) {
  const { user, organization, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-10 bg-dark-900 border-b border-dark-700">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg"
          onClick={onMenuClick}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        {/* Organization name */}
        <div className="hidden lg:flex items-center gap-2 text-dark-300">
          <BuildingOfficeIcon className="h-5 w-5" />
          <span className="text-sm font-medium text-foreground">{organization?.name}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* User menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-3 p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-dark-400">{user?.role_label}</p>
              </div>
              <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-dark-950">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-56 bg-dark-800 border border-dark-600 rounded-xl shadow-card py-1 focus:outline-none">
                <div className="px-4 py-3 border-b border-dark-600">
                  <p className="text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="text-sm text-dark-300">{user?.email}</p>
                </div>

                <div className="py-1">
                  {settingsLinks.map((link) => (
                    <Menu.Item key={link.tab}>
                      {({ active }) => (
                        <button
                          onClick={() => navigate(`/settings?tab=${link.tab}`)}
                          className={`${
                            active ? 'bg-dark-700' : ''
                          } flex items-center gap-3 w-full px-4 py-2 text-sm text-dark-200`}
                        >
                          <link.icon className="h-5 w-5" />
                          {link.label}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>

                <div className="border-t border-dark-600 pt-1">
                  {isAdmin && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate('/users')}
                          className={`${
                            active ? 'bg-dark-700' : ''
                          } flex items-center gap-3 w-full px-4 py-2 text-sm text-dark-200`}
                        >
                          <UsersIcon className="h-5 w-5" />
                          Users
                        </button>
                      )}
                    </Menu.Item>
                  )}
                </div>

                <div className="border-t border-dark-600 pt-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={logout}
                        className={`${
                          active ? 'bg-dark-700' : ''
                        } flex items-center gap-3 w-full px-4 py-2 text-sm text-danger-400`}
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  )
}
