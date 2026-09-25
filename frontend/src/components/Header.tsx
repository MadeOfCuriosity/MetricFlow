import { Fragment, useState, useEffect } from 'react'
import { Menu, Transition, Dialog } from '@headlessui/react'
import { useNavigate } from 'react-router-dom'
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  SwatchIcon,
  XMarkIcon,
  HomeIcon,
  ChartBarIcon,
  TableCellsIcon,
  LightBulbIcon,
  FolderIcon,
  UsersIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { LiquidBridge } from './LiquidBridge'
import { MaskIcon } from './ui/MaskIcon'

export function MagicWandIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
      <path d="m14 7 3 3" />
      <path d="M5 6v4" />
      <path d="M19 14v4" />
      <path d="M10 2v2" />
      <path d="M7 8H3" />
      <path d="M21 16h-4" />
      <path d="M11 3H9" />
    </svg>
  )
}

interface HeaderProps {
  onMenuClick?: () => void
  onToggleAIAgent?: () => void
  isAIAgentOpen?: boolean
}

function DataTableIcon({ className = '' }: { className?: string }) {
  return <MaskIcon src="/icons/datatable.svg" className={className} />
}

const profileMenuLinks = [
  { path: '/data-table', label: 'Data Table', icon: DataTableIcon, adminOnly: false },
  { path: '/settings', label: 'Settings', icon: Cog6ToothIcon, adminOnly: false },
]

const searchItems = [
  { name: 'Dashboard', path: '/dashboard', icon: HomeIcon, category: 'Navigation' },
  { name: 'Rooms & Departments', path: '/rooms', icon: FolderIcon, category: 'Navigation' },
  { name: 'KPIs & Metrics', path: '/kpis', icon: ChartBarIcon, category: 'Navigation' },
  { name: 'Data Table', path: '/data-table', icon: TableCellsIcon, category: 'Navigation' },
  { name: 'Daily Data Entries', path: '/entries', icon: TableCellsIcon, category: 'Navigation' },
  { name: 'AI Insights', path: '/insights', icon: LightBulbIcon, category: 'Navigation' },
  { name: 'Room Management', path: '/settings/rooms', icon: FolderIcon, category: 'Admin' },
  { name: 'User Management', path: '/settings/users', icon: UsersIcon, category: 'Admin' },
  { name: 'Integrations', path: '/settings/integrations', icon: ArrowPathRoundedSquareIcon, category: 'Admin' },
  { name: 'Profile Settings', path: '/settings/profile', icon: UserCircleIcon, category: 'Settings' },
  { name: 'Appearance & Theme', path: '/settings/appearance', icon: SwatchIcon, category: 'Settings' },
]

export function Header({ onMenuClick, onToggleAIAgent, isAIAgentOpen }: HeaderProps) {
  const { user, organization, logout, isAdmin } = useAuth()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const visibleProfileMenuLinks = profileMenuLinks.filter((link) => !link.adminOnly || isAdmin)

  // Global Cmd+K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredSearchItems = searchItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <header className="sticky top-0 z-30 w-full pt-3.5 pb-2 px-4 flex justify-center pointer-events-none relative">
        <div className="flex items-center pointer-events-auto max-w-full">
          
          {/* Pod 1: Brand / Logo / Mobile Menu (Left Cap Circle) */}
          <div className="rounded-l-full border-t border-b border-l border-dark-700 bg-dark-900 h-12 w-12 flex-shrink-0 flex items-center justify-center relative group">
            {/* Desktop Brand Icon */}
            <button
              onClick={() => navigate('/dashboard')}
              className="hidden lg:flex items-center justify-center focus:outline-none translate-x-1"
              title="Dashboard"
            >
              <div className="w-8 h-8 rounded-full border border-dark-700 bg-dark-850/80 flex items-center justify-center group-hover:border-foreground/30 group-hover:bg-dark-800 transition-all">
                <img
                  src={resolvedTheme === 'light' ? '/visualise_dark.png' : '/visualise.png'}
                  alt="Visualize"
                  className="w-4 h-4 flex-shrink-0 object-contain translate-x-[1px]"
                />
              </div>
            </button>

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              className="lg:hidden flex items-center justify-center focus:outline-none translate-x-1"
              onClick={onMenuClick}
              title="Open Navigation Menu"
            >
              <div className="w-8 h-8 rounded-full border border-dark-700 bg-dark-850/80 flex items-center justify-center group-hover:border-foreground/30 group-hover:bg-dark-800 transition-all">
                <img
                  src={resolvedTheme === 'light' ? '/visualise_dark.png' : '/visualise.png'}
                  alt="Visualize"
                  className="w-4 h-4 flex-shrink-0 object-contain translate-x-[1px]"
                />
              </div>
            </button>
          </div>

          {/* Liquid Bridge 1 */}
          <LiquidBridge width={20} height={48} waistDepth={11} />

          {/* Pod 2: Organization Name Capsule */}
          <div className="h-12 border-t border-b border-dark-700 bg-dark-900 flex-shrink-0 flex items-center px-4 sm:px-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm font-semibold text-foreground tracking-tight hover:opacity-80 transition-opacity focus:outline-none truncate max-w-[150px] sm:max-w-[240px]"
              title={organization?.name ? `${organization.name} Dashboard` : 'Dashboard'}
            >
              {organization?.name || 'Visualize'}
            </button>
          </div>

          {/* Liquid Bridge 2 */}
          <LiquidBridge width={20} height={48} waistDepth={11} />

          {/* Pod 3: Quick Search Pod (Circle Node) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="h-12 w-12 border-t border-b border-solid border-dark-700 bg-dark-900 flex-shrink-0 flex items-center justify-center group cursor-pointer hover:bg-dark-850 transition-colors focus:outline-none"
            title="Search (Cmd+K)"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <MaskIcon src="/icons/search.svg" className="w-4 h-4 text-dark-300 group-hover:text-foreground transition-colors" />
            </div>
          </button>

          {/* Liquid Bridge 3 */}
          <LiquidBridge width={20} height={48} waistDepth={11} />

          {/* Pod 4: Ask Visualize AI Agent Pod (Circle Node) */}
          <button
            type="button"
            onClick={onToggleAIAgent}
            className="h-12 w-12 border-t border-b border-solid border-dark-700 bg-dark-900 flex-shrink-0 flex items-center justify-center group cursor-pointer hover:bg-dark-850 transition-colors focus:outline-none"
            title="Ask Visualize"
            aria-label="Ask Visualize"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                isAIAgentOpen
                  ? 'bg-brand text-white'
                  : 'text-dark-300 group-hover:text-foreground group-hover:bg-dark-800'
              }`}
            >
              <MagicWandIcon
                className={`w-4 h-4 transition-transform duration-200 group-hover:rotate-12 ${
                  isAIAgentOpen ? 'text-white stroke-[2.2]' : 'stroke-[2]'
                }`}
              />
            </div>
          </button>

          {/* Liquid Bridge 4 */}
          <LiquidBridge width={20} height={48} waistDepth={11} />

          {/* Pod 5: User Profile Capsule (Right Cap Pill - Download App style) */}
          <div className="h-12 rounded-r-full border-t border-b border-r border-dark-700 bg-dark-900 flex-shrink-0 flex items-center pl-2 pr-2.5 sm:pr-3.5 relative">
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 p-1 text-dark-300 hover:text-foreground rounded-full hover:bg-dark-800/80 transition-colors focus:outline-none">
                <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-dark-950">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left pr-1">
                  <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[85px]">
                    {user?.name?.split(' ')[0] || 'Account'}
                  </p>
                  <p className="text-[10px] text-dark-400 leading-none mt-1 truncate max-w-[85px]">
                    {user?.role_label || 'Admin'}
                  </p>
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
                <Menu.Items className="absolute right-0 mt-3 w-56 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl py-1.5 focus:outline-none z-50">
                  <div className="px-4 py-2.5 border-b border-dark-700">
                    <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-[11px] text-dark-400 truncate">{user?.email}</p>
                    {organization?.name && (
                      <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-dark-800 border border-dark-700 text-dark-300">
                        {organization.name}
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    {visibleProfileMenuLinks.map((link) => (
                      <Menu.Item key={link.path}>
                        {({ active }) => (
                          <button
                            onClick={() => navigate(link.path)}
                            className={`${
                              active ? 'bg-dark-800 text-foreground' : 'text-dark-300'
                            } flex items-center gap-3 w-full px-4 py-2 text-xs font-medium transition-colors`}
                          >
                            <link.icon className="h-4 w-4" />
                            {link.label}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>

                  <div className="border-t border-dark-700 pt-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={logout}
                          className={`${
                            active ? 'bg-dark-800 text-danger-400' : 'text-danger-400'
                          } flex items-center gap-3 w-full px-4 py-2 text-xs font-medium transition-colors`}
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4" />
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

        {/* Top Right Corner Beta Tag */}
        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 pointer-events-auto flex items-center">
          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand bg-brand/10 border border-brand/20 rounded-full select-none shadow-sm backdrop-blur-md">
            Beta
          </span>
        </div>
      </header>

      {/* Spotlight Command Search Modal (Cmd+K) */}
      <Transition appear show={isSearchOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsSearchOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel className="mx-auto max-w-xl transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 shadow-2xl transition-all">
                {/* Search Input */}
                <div className="relative border-b border-dark-700 flex items-center px-4">
                  <MaskIcon src="/icons/search.svg" className="h-5 w-5 text-dark-400 mr-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pages, metrics, settings... (ESC to exit)"
                    className="w-full bg-transparent py-4 text-sm text-foreground placeholder-dark-400 focus:outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-dark-400 hover:text-foreground"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Results List */}
                <div className="max-h-80 overflow-y-auto p-2">
                  {filteredSearchItems.length === 0 ? (
                    <p className="p-4 text-center text-xs text-dark-400">
                      No matching pages or tools found.
                    </p>
                  ) : (
                    filteredSearchItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path)
                          setIsSearchOpen(false)
                          setSearchQuery('')
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-dark-800 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-dark-800 group-hover:bg-dark-700 text-foreground border border-dark-700">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-[11px] text-dark-400">{item.path}</p>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-dark-400 bg-dark-800 px-2 py-0.5 rounded border border-dark-700">
                          {item.category}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 bg-dark-850/60 border-t border-dark-700 text-[11px] text-dark-400">
                  <span>Navigate with <kbd className="px-1.5 py-0.5 bg-dark-800 border border-dark-700 rounded text-foreground">↵</kbd></span>
                  <span>Press <kbd className="px-1.5 py-0.5 bg-dark-800 border border-dark-700 rounded text-foreground">ESC</kbd> to close</span>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
