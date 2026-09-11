import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  PlusIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { useAuth } from '../context/AuthContext'
import { RoomTreeNode } from '../types/room'
import { CreateRoomModal } from './CreateRoomModal'

interface RoomTreeItemProps {
  room: RoomTreeNode
  level: number
  isLast: boolean
  // Per ancestor depth: whether that ancestor has more siblings below it,
  // i.e. whether its guide line should keep running through this row.
  ancestorLines: boolean[]
}

const TREE_INDENT = 16
const TREE_BASE_OFFSET = 12

function RoomTreeItem({ room, level, isLast, ancestorLines }: RoomTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const location = useLocation()
  const hasChildren = room.children && room.children.length > 0
  const isActive = location.pathname === `/rooms/${room.id}`
  const childAncestorLines = [...ancestorLines, !isLast]

  return (
    <div>
      <NavLink
        to={`/rooms/${room.id}`}
        className={`group relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-foreground/10 text-foreground font-semibold'
            : 'text-dark-300 hover:text-foreground hover:bg-dark-800'
        }`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {level > 0 && (
          <div className="absolute inset-y-0 left-0 pointer-events-none">
            {/* Pass-through guide lines for ancestors above the immediate parent */}
            {ancestorLines.slice(0, -1).map(
              (show, i) =>
                show && (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-dark-700/60"
                    style={{ left: TREE_BASE_OFFSET + i * TREE_INDENT + 8 }}
                  />
                )
            )}
            {/* Connector to this node: vertical stub (full or half for last child) + horizontal branch */}
            <div
              className="absolute border-l border-dark-700/60"
              style={{
                left: TREE_BASE_OFFSET + (level - 1) * TREE_INDENT + 8,
                top: 0,
                height: isLast ? '50%' : '100%',
              }}
            />
            <div
              className="absolute border-t border-dark-700/60"
              style={{
                left: TREE_BASE_OFFSET + (level - 1) * TREE_INDENT + 8,
                top: '50%',
                width: TREE_INDENT,
              }}
            />
          </div>
        )}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="mr-1 p-0.5 hover:bg-dark-600 rounded relative z-10"
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
          {room.children.map((child, index) => (
            <RoomTreeItem
              key={child.id}
              room={child}
              level={level + 1}
              isLast={index === room.children.length - 1}
              ancestorLines={childAncestorLines}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export interface SidebarProps {
  className?: string
  onCollapse?: () => void
  footer?: React.ReactNode
}

export function Sidebar({ className, onCollapse, footer }: SidebarProps = {}) {
  const { roomTree, isLoading } = useRoom()
  const { isAdmin } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleRoomCreated = (roomId: string) => {
    setIsCreateModalOpen(false)
    navigate(`/rooms/${roomId}`)
  }

  const containerClass =
    className ||
    'flex flex-col w-64 m-4 bg-dark-900 border border-dark-700 rounded-2xl shadow-card overflow-hidden'

  return (
    <>
      <div className={containerClass}>
        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-3">
          {/* Rooms Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                {isAdmin ? 'Rooms' : 'My Rooms'}
              </span>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="p-1 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded transition-colors"
                    title="Add Room"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                )}
                {onCollapse && (
                  <button
                    onClick={onCollapse}
                    className="p-1 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded transition-colors"
                    title="Collapse Sidebar"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-0.5">
              {isLoading ? (
                <div className="px-3 py-2 text-sm text-dark-400">Loading...</div>
              ) : roomTree.length === 0 ? (
                <div className="px-3 py-2 text-sm text-dark-400">
                  {isAdmin ? 'No rooms yet' : 'No rooms assigned'}
                </div>
              ) : (
                roomTree.map((room, index) => (
                  <RoomTreeItem
                    key={room.id}
                    room={room}
                    level={0}
                    isLast={index === roomTree.length - 1}
                    ancestorLines={[]}
                  />
                ))
              )}
            </div>
          </div>
        </nav>
        {footer}
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
