import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import {
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LightBulbIcon,
  Cog6ToothIcon,
  PlusIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  UsersIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { useAuth } from '../context/AuthContext'
import { RoomTreeNode } from '../types/room'
import { CreateRoomModal } from './CreateRoomModal'

// Navigation items with optional adminOnly flag
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, adminOnly: true },
  { name: 'KPIs', href: '/kpis', icon: ChartBarIcon, adminOnly: true },
  { name: 'Data', href: '/data', icon: CircleStackIcon, adminOnly: true },
  { name: 'Data Entry', href: '/entries', icon: DocumentTextIcon, adminOnly: false },
  { name: 'Insights', href: '/insights', icon: LightBulbIcon, adminOnly: true },
]

const secondaryNavigation = [
  { name: 'Users', href: '/users', icon: UsersIcon, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, adminOnly: false },
]

interface RoomTreeItemProps {
  room: RoomTreeNode
  level: number
}

function RoomTreeItem({ room, level }: RoomTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const location = useLocation()
  const hasChildren = room.children && room.children.length > 0
  const isActive = location.pathname === `/rooms/${room.id}`

  return (
    <div>
      <NavLink
        to={`/rooms/${room.id}`}
        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-500/15 text-primary-400'
            : 'text-dark-300 hover:text-foreground hover:bg-dark-800'
        }`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="mr-1 p-0.5 hover:bg-dark-600 rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4 mr-1" />
        )}
        <FolderIcon className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="truncate flex-1">{room.name}</span>
        {room.kpi_count > 0 && (
          <span className="ml-2 text-xs text-dark-400">{room.kpi_count}</span>
        )}
      </NavLink>
      {hasChildren && isExpanded && (
        <div>
          {room.children.map((child) => (
            <RoomTreeItem key={child.id} room={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const { roomTree, isLoading } = useRoom()
  const { isAdmin } = useAuth()
  const { resolvedTheme } = useTheme()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleRoomCreated = (roomId: string) => {
    setIsCreateModalOpen(false)
    navigate(`/rooms/${roomId}`)
  }

  // Filter navigation based on role
  const filteredNavigation = navigation.filter((item) => !item.adminOnly || isAdmin)
  const filteredSecondaryNavigation = secondaryNavigation.filter(
    (item) => !item.adminOnly || isAdmin
  )

  return (
    <>
      <div className={`flex flex-col bg-dark-900 border-r border-dark-700 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-dark-700 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
          <div className="flex items-center gap-2">
            <img src={resolvedTheme === 'light' ? '/visualise_dark.png' : '/visualise.png'} alt="Visualize" className="w-6 h-6 flex-shrink-0" />
            {!collapsed && <span className="text-xl font-bold text-foreground">Visualize</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          <div className="space-y-1">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `group flex items-center py-2 text-sm font-medium rounded-lg transition-colors ${
                    collapsed ? 'justify-center px-2' : 'px-3'
                  } ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-400'
                      : 'text-dark-300 hover:text-foreground hover:bg-dark-800'
                  }`
                }
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} aria-hidden="true" />
                {!collapsed && item.name}
              </NavLink>
            ))}
          </div>

          {/* Rooms Section */}
          {!collapsed ? (
            <div className="pt-6 mt-6">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  {isAdmin ? 'Rooms' : 'My Rooms'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="p-1 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded transition-colors"
                    title="Add Room"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {isLoading ? (
                  <div className="px-3 py-2 text-sm text-dark-400">Loading...</div>
                ) : roomTree.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-dark-400">
                    {isAdmin ? 'No rooms yet' : 'No rooms assigned'}
                  </div>
                ) : (
                  roomTree.map((room) => (
                    <RoomTreeItem key={room.id} room={room} level={0} />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="pt-6 mt-6 space-y-1">
              {!isLoading && roomTree.length > 0 && roomTree.map((room) => (
                <NavLink
                  key={room.id}
                  to={`/rooms/${room.id}`}
                  title={room.name}
                  className={({ isActive }) =>
                    `group flex items-center justify-center py-2 px-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-500/15 text-primary-400'
                        : 'text-dark-300 hover:text-foreground hover:bg-dark-800'
                    }`
                  }
                >
                  <span className="w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {room.name.charAt(0).toUpperCase()}
                  </span>
                </NavLink>
              ))}
              {isAdmin && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center justify-center w-full py-2 px-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
                  title="Add Room"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

        </nav>

        {/* Secondary nav + Collapse toggle */}
        <div className={`border-t border-dark-700 ${collapsed ? 'px-2' : 'px-3'} py-2 space-y-1`}>
          {filteredSecondaryNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              title={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                `group flex items-center py-2 text-sm font-medium rounded-lg transition-colors ${
                  collapsed ? 'justify-center px-2' : 'px-3'
                } ${
                  isActive
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'text-dark-300 hover:text-foreground hover:bg-dark-800'
                }`
              }
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} aria-hidden="true" />
              {!collapsed && item.name}
            </NavLink>
          ))}
        </div>

        {/* Collapse toggle */}
        {onToggleCollapse && (
          <div className="border-t border-dark-700 p-2">
            <button
              onClick={onToggleCollapse}
              className={`flex items-center w-full py-2 text-sm font-medium text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors ${
                collapsed ? 'justify-center px-2' : 'px-3'
              }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeftIcon
                className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                  collapsed ? 'rotate-180' : ''
                } ${collapsed ? '' : 'mr-3'}`}
              />
              {!collapsed && 'Collapse'}
            </button>
          </div>
        )}
      </div>

      {/* Create Room Modal - Only for Admin */}
      {isAdmin && (
        <CreateRoomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleRoomCreated}
        />
      )}
    </>
  )
}
