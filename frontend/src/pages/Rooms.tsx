import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderIcon,
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  UsersIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FolderPlusIcon,
  ArrowRightIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { CreateRoomModal } from '../components/CreateRoomModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import { GlassmorphicFolder } from '../components/GlassmorphicFolder'
import { TagColorPickerPopover } from '../components/TagColorPickerPopover'
import { SEOHead } from '../components/SEOHead'
import { getTagColor } from '../constants/tagColors'
import { Room, RoomTreeNode } from '../types/room'

export function Rooms() {
  const { rooms, roomTree, isLoading, fetchRooms, fetchRoomTree, updateRoom, deleteRoom } = useRoom()
  const { success, error: showError } = useToast()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'top' | 'with-kpis'>('all')
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'desktop' | 'tree'>('desktop')
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined)
  const [roomToDelete, setRoomToDelete] = useState<Room | RoomTreeNode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Computed summary metrics
  const totalRoomsCount = rooms.length
  const topLevelRoomsCount = useMemo(() => rooms.filter((r) => !r.parent_room_id).length, [rooms])
  const subRoomsCount = useMemo(() => rooms.filter((r) => !!r.parent_room_id).length, [rooms])
  const totalKpisCount = useMemo(
    () => rooms.reduce((acc, r) => acc + (r.kpi_count || 0), 0),
    [rooms]
  )

  // Tag color counts for filter pills
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    rooms.forEach((r) => {
      if (r.color) {
        counts[r.color] = (counts[r.color] || 0) + 1
      }
    })
    return counts
  }, [rooms])
  const totalTaggedCount = useMemo(() => Object.values(tagCounts).reduce((a, b) => a + b, 0), [tagCounts])

  // Filtered rooms for desktop icons grid
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        !searchQuery.trim() ||
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchesSearch) return false

      if (filterType === 'top') return !room.parent_room_id
      if (filterType === 'with-kpis') return (room.kpi_count || 0) > 0

      // Color tag filter
      if (selectedTagFilter && room.color !== selectedTagFilter) return false

      return true
    })
  }, [rooms, searchQuery, filterType, selectedTagFilter])

  const handleRoomCreated = (roomId: string) => {
    setIsCreateModalOpen(false)
    setCreateParentId(undefined)
    fetchRooms()
    fetchRoomTree()
    navigate(`/rooms/${roomId}`)
  }

  const handleOpenCreateModal = (parentId?: string) => {
    setCreateParentId(parentId)
    setIsCreateModalOpen(true)
  }

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return
    setIsDeleting(true)
    try {
      await deleteRoom(roomToDelete.id)
      success('Room deleted', `"${roomToDelete.name}" has been removed`)
      setRoomToDelete(null)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      showError('Failed to delete room', error.response?.data?.detail || 'Please try again')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateRoomColor = async (roomId: string, newColor: string | null) => {
    try {
      await updateRoom(roomId, { color: newColor })
      success(
        newColor ? 'Tag updated' : 'Tag removed',
        newColor ? `Room tagged as ${newColor}` : 'Default obsidian folder restored'
      )
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      showError('Failed to update tag', error.response?.data?.detail || 'Please try again')
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <SEOHead title="Rooms" description="Organize metrics and KPIs across departments, teams, and collaborative spaces." />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Rooms</h1>
          <p className="text-dark-300 mt-1 text-sm">
            Organize metrics and KPIs across departments, teams, and collaborative spaces.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* Subtle Room Summary Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <FolderIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Total Rooms:</span>
          <span className="font-semibold text-foreground">{totalRoomsCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
          <span className="text-dark-400">Departments:</span>
          <span className="font-semibold text-foreground">{topLevelRoomsCount}</span>
          <span className="text-[10px] text-dark-400">(Top-level)</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <UsersIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Sub-Rooms:</span>
          <span className="font-semibold text-foreground">{subRoomsCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <ChartBarIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Attached KPIs:</span>
          <span className="font-semibold text-foreground">{totalKpisCount}</span>
        </div>
      </div>

      {/* Toolbar: Search, Filters & View Mode */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
            className="w-full pl-9 pr-4 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Filter tabs */}
          <div className="flex items-center p-1 bg-dark-900 border border-dark-700 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-dark-800 text-foreground shadow-sm'
                  : 'text-dark-400 hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType('top')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'top'
                  ? 'bg-dark-800 text-foreground shadow-sm'
                  : 'text-dark-400 hover:text-foreground'
              }`}
            >
              Departments
            </button>
            <button
              type="button"
              onClick={() => setFilterType('with-kpis')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'with-kpis'
                  ? 'bg-dark-800 text-foreground shadow-sm'
                  : 'text-dark-400 hover:text-foreground'
              }`}
            >
              With KPIs
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center p-1 bg-dark-900 border border-dark-700 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'desktop'
                  ? 'bg-dark-800 text-foreground'
                  : 'text-dark-400 hover:text-foreground'
              }`}
              title="Desktop Folders View"
              aria-label="Desktop Folders View"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-dark-800 text-foreground'
                  : 'text-dark-400 hover:text-foreground'
              }`}
              title="Hierarchy View"
              aria-label="Hierarchy View"
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Color Tag Filter Strip (if any rooms are tagged) */}
      {totalTaggedCount > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <TagIcon className="w-3 h-3" />
            Tags:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTagFilter(null)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTagFilter === null
                ? 'bg-foreground text-dark-950 shadow-xs font-semibold'
                : 'bg-dark-900 border border-dark-700/80 text-dark-300 hover:text-foreground hover:border-dark-600'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full ${
                selectedTagFilter === null ? 'bg-dark-950/20 text-dark-950' : 'bg-dark-800 text-dark-400'
              }`}
            >
              {rooms.length}
            </span>
          </button>

          {Object.entries(tagCounts).map(([colorId, count]) => {
            const tagDef = getTagColor(colorId)
            const isSelected = selectedTagFilter === colorId
            return (
              <button
                key={colorId}
                type="button"
                onClick={() => setSelectedTagFilter(isSelected ? null : colorId)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-dark-800 border text-foreground shadow-xs'
                    : 'bg-dark-900 border border-dark-700/80 text-dark-300 hover:text-foreground hover:border-dark-600'
                }`}
                style={isSelected ? { borderColor: tagDef?.hex || 'currentColor' } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: tagDef?.hex || colorId,
                    boxShadow: isSelected ? `0 0 8px ${tagDef?.ambientGlow || tagDef?.hex}` : undefined,
                  }}
                />
                <span className="capitalize">{tagDef?.name || colorId}</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-dark-800 text-dark-400">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
        </div>
      ) : rooms.length === 0 ? (
        /* Empty State */
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div
            onClick={() => handleOpenCreateModal()}
            className="flex flex-col items-center group cursor-pointer select-none p-4 rounded-3xl hover:bg-dark-900/40 transition-all"
          >
            <div className="w-44 h-36 rounded-3xl border-2 border-dashed border-dark-700 group-hover:border-dark-500 bg-dark-900/20 group-hover:bg-dark-900/60 transition-all flex items-center justify-center group-hover:scale-105 duration-200 shadow-sm">
              <PlusIcon className="w-9 h-9 text-dark-400 group-hover:text-foreground transition-colors stroke-[1.5]" />
            </div>
            <div className="mt-4 flex flex-col items-center text-center">
              <span className="text-base font-semibold text-foreground tracking-tight group-hover:text-white transition-colors">
                New Room
              </span>
              <span className="text-xs text-dark-400 mt-1">Click to create</span>
            </div>
          </div>
        </div>
      ) : viewMode === 'desktop' ? (
        /* Desktop Folder Grid: NO bg card, standalone glassmorphic desktop folders */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-12 gap-x-6 justify-items-center py-4">
          {filteredRooms.map((room) => {
            const isHovered = hoveredRoomId === room.id
            const tag = getTagColor(room.color)

            return (
              <div
                key={room.id}
                onClick={() => navigate(`/rooms/${room.id}`)}
                onMouseEnter={() => setHoveredRoomId(room.id)}
                onMouseLeave={() => setHoveredRoomId(null)}
                className="flex flex-col items-center group cursor-pointer w-44 select-none relative p-2 rounded-2xl hover:bg-dark-900/30 transition-colors"
              >
                {/* Floating Quick Actions on Hover */}
                <div className="absolute top-1 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-dark-900/90 border border-dark-700 rounded-lg p-0.5 shadow-lg backdrop-blur-sm">
                  <TagColorPickerPopover
                    selectedColor={room.color}
                    onSelectColor={(c) => handleUpdateRoomColor(room.id, c)}
                    align="right"
                  >
                    {({ toggle }) => (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggle(e)
                        }}
                        className="p-1 text-dark-400 hover:text-foreground rounded hover:bg-dark-800 transition-colors cursor-pointer"
                        title="Set tag color"
                        aria-label="Set tag color"
                      >
                        <TagIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </TagColorPickerPopover>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenCreateModal(room.id)
                    }}
                    className="p-1 text-dark-400 hover:text-foreground rounded hover:bg-dark-800 transition-colors"
                    title="Add sub-room"
                    aria-label="Add sub-room"
                  >
                    <FolderPlusIcon className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRoomToDelete(room)
                      }}
                      className="p-1 text-dark-400 hover:text-danger-400 rounded hover:bg-danger-500/10 transition-colors"
                      title="Delete room"
                      aria-label="Delete room"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Glassmorphic 3D Desktop Folder Icon */}
                <div className="relative flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-105">
                  <GlassmorphicFolder
                    color={room.color}
                    className="w-36 h-34"
                    isHovered={isHovered}
                  />
                </div>

                {/* Desktop Folder Name & Subtitle */}
                <div className="mt-3.5 flex flex-col items-center max-w-full text-center px-1">
                  <div className="flex items-center justify-center gap-1.5 max-w-full">
                    <TagColorPickerPopover
                      selectedColor={room.color}
                      onSelectColor={(c) => handleUpdateRoomColor(room.id, c)}
                      align="center"
                    >
                      {({ toggle }) => (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(e)
                          }}
                          className="flex items-center justify-center p-1 -m-0.5 rounded-full hover:bg-dark-800 transition-all cursor-pointer"
                          title={tag ? `Tag: ${tag.name} (Click to change)` : 'Add tag color'}
                        >
                          {tag ? (
                            <span
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tag.dotClass || ''} hover:scale-125 transition-transform`}
                              style={{
                                backgroundColor: tag.hex,
                                boxShadow: `0 0 6px ${tag.ambientGlow}`,
                              }}
                            />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-dark-400 dark:border-dark-600 group-hover:border-foreground transition-colors" />
                          )}
                        </button>
                      )}
                    </TagColorPickerPopover>
                    <span className="text-sm font-semibold text-foreground tracking-tight px-2 py-0.5 rounded-md group-hover:bg-dark-800/80 group-hover:text-foreground transition-colors truncate max-w-full">
                      {room.name}
                    </span>
                  </div>
                  <span className="text-xs text-dark-400 mt-0.5 font-normal">
                    {room.kpi_count > 0 ? `${room.kpi_count} KPIs` : '0 KPIs'}
                    {(room.sub_room_count || 0) > 0 ? ` · ${room.sub_room_count} subs` : ''}
                  </span>
                </div>
              </div>
            )
          })}

          {/* New Room Desktop Folder Item */}
          <div
            onClick={() => handleOpenCreateModal()}
            className="flex flex-col items-center group cursor-pointer w-44 select-none p-2 rounded-2xl hover:bg-dark-900/30 transition-colors"
          >
            <div className="w-36 h-34 rounded-2xl border-2 border-dashed border-dark-700/80 group-hover:border-dark-500 flex flex-col items-center justify-center transition-all bg-dark-900/10 group-hover:bg-dark-900/30 group-hover:scale-105">
              <PlusIcon className="w-7 h-7 text-dark-400 group-hover:text-foreground transition-colors stroke-[2]" />
            </div>
            <div className="mt-3.5 flex flex-col items-center text-center">
              <span className="text-sm font-medium text-dark-400 group-hover:text-foreground tracking-tight transition-colors">
                New Room
              </span>
              <span className="text-xs text-dark-500 mt-0.5">Click to create</span>
            </div>
          </div>
        </div>
      ) : (
        /* Hierarchical Tree View */
        <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden divide-y divide-dark-700/80">
          {roomTree.map((node) => (
            <RoomTreeItem
              key={node.id}
              node={node}
              level={0}
              onNavigate={(id) => navigate(`/rooms/${id}`)}
              onAddSubRoom={(id) => handleOpenCreateModal(id)}
              onDelete={(room) => setRoomToDelete(room)}
              onUpdateColor={handleUpdateRoomColor}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateParentId(undefined)
        }}
        onCreated={handleRoomCreated}
        parentRoomId={createParentId}
      />

      {/* Delete Confirmation Modal */}
      {roomToDelete && (
        <DeleteConfirmModal
          isOpen={!!roomToDelete}
          onClose={() => setRoomToDelete(null)}
          onConfirm={handleDeleteRoom}
          title="Delete Room"
          message={`Are you sure you want to delete "${roomToDelete.name}"? This action cannot be undone.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}

/** Full-width tree item component */
function RoomTreeItem({
  node,
  level,
  onNavigate,
  onAddSubRoom,
  onDelete,
  onUpdateColor,
  isAdmin,
}: {
  node: RoomTreeNode
  level: number
  onNavigate: (id: string) => void
  onAddSubRoom: (id: string) => void
  onDelete: (room: RoomTreeNode) => void
  onUpdateColor: (roomId: string, color: string | null) => void
  isAdmin: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const tag = getTagColor(node.color)

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-dark-850/50 transition-colors group"
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-dark-400 hover:text-foreground rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-6" />
        )}

        {/* Room info */}
        <button
          type="button"
          onClick={() => onNavigate(node.id)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
        >
          <div className="relative flex items-center justify-center flex-shrink-0">
            <FolderIcon className="h-5 w-5 text-dark-400 group-hover:text-foreground transition-colors" />
            {tag && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-dark-900 ${tag.dotClass || ''}`}
                style={{ backgroundColor: tag.hex }}
                title={`${tag.name} tag`}
              />
            )}
          </div>
          <span className="text-foreground font-medium text-sm truncate">{node.name}</span>
          {node.description && (
            <span className="hidden md:inline text-xs text-dark-400 truncate max-w-sm">
              — {node.description}
            </span>
          )}
        </button>

        {/* Stats badges */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {node.kpi_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-dark-400 bg-dark-800 border border-dark-700 px-2 py-0.5 rounded-full">
              <ChartBarIcon className="h-3.5 w-3.5" />
              {node.kpi_count} KPIs
            </span>
          )}
          {hasChildren && (
            <span className="flex items-center gap-1 text-xs text-dark-400 bg-dark-800 border border-dark-700 px-2 py-0.5 rounded-full">
              <UsersIcon className="h-3.5 w-3.5" />
              {node.children.length} sub
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <TagColorPickerPopover
            selectedColor={node.color}
            onSelectColor={(color) => onUpdateColor(node.id, color)}
            align="right"
          >
            {({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                title="Change tag color"
                aria-label="Change tag color"
              >
                <TagIcon className="w-4 h-4" />
              </button>
            )}
          </TagColorPickerPopover>
          <button
            type="button"
            onClick={() => onAddSubRoom(node.id)}
            className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
            title="Add sub-room"
            aria-label="Add sub-room"
          >
            <FolderPlusIcon className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="p-1.5 text-dark-500 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Delete room"
              aria-label="Delete room"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate(node.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-800 text-foreground hover:bg-dark-750 text-xs font-medium transition-colors"
          >
            <span>Open</span>
            <ArrowRightIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <RoomTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onNavigate={onNavigate}
              onAddSubRoom={onAddSubRoom}
              onDelete={onDelete}
              onUpdateColor={onUpdateColor}
              isAdmin={isAdmin}
            />
          ))}
        </>
      )}
    </>
  )
}
