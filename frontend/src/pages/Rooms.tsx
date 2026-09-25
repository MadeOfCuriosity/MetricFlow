import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderIcon,
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  UsersIcon,
  ChartBarIcon,
  Squares2X2Icon,
  FolderPlusIcon,
  ArrowRightIcon,
  TagIcon,
  XMarkIcon,
  FolderOpenIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { RoomFormModal } from '../components/RoomFormModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import { GlassmorphicFolder } from '../components/GlassmorphicFolder'
import { TagColorPickerPopover } from '../components/TagColorPickerPopover'
import { SEOHead } from '../components/SEOHead'
import { AssignKPIPopover } from '../components/AssignKPIPopover'
import { kpisApi } from '../services/kpis'
import { roomsApi } from '../services/rooms'
import { getTagColor } from '../constants/tagColors'
import { TagDot, TagFolderIcon } from '../components/ui/Tag'
import { Room, RoomTreeNode } from '../types/room'
import { getApiError } from '../lib/apiError'
import { Spinner } from '../components/ui/Spinner'
import { SearchInput } from '../components/ui/SearchInput'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { StatChip } from '../components/ui/StatChip'
import { MaskIcon } from '../components/ui/MaskIcon'
import type { KPI } from '../types/kpi'
import { TreeGuides, treeRowClass, rowActionsClass } from '../components/ui/Tree'


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
  const [kpis, setKpis] = useState<KPI[]>([])

  const fetchKpis = useCallback(async () => {
    try {
      setKpis(await kpisApi.getAll())
    } catch (err) {
      console.error('Failed to fetch KPIs:', err)
    }
  }, [])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  // Room id -> KPIs directly assigned to it
  const kpisByRoom = useMemo(() => {
    const map: Record<string, KPI[]> = {}
    kpis.forEach((kpi) => {
      ;(kpi.assigned_room_ids || []).forEach((roomId) => {
        ;(map[roomId] ||= []).push(kpi)
      })
    })
    Object.values(map).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)))
    return map
  }, [kpis])

  const unassignedKpis = useMemo(
    () => kpis.filter((k) => !(k.assigned_room_ids || []).length).sort((a, b) => a.name.localeCompare(b.name)),
    [kpis]
  )

  const refreshMapping = () => Promise.all([fetchKpis(), fetchRooms(), fetchRoomTree()])

  const handleAssignKpis = async (roomId: string, kpiIds: string[]) => {
    try {
      const res = await roomsApi.assignKPIs(roomId, { kpi_ids: kpiIds })
      success('KPIs assigned', `${res.assigned_count} KPI${res.assigned_count === 1 ? '' : 's'} added to room`)
      await refreshMapping()
    } catch (err: unknown) {
      showError('Failed to assign KPIs', getApiError(err, 'Please try again'))
    }
  }

  const handleRemoveKpi = async (roomId: string, kpi: KPI) => {
    try {
      await roomsApi.removeKPI(roomId, kpi.id)
      success('KPI removed', `"${kpi.name}" unassigned from room`)
      await refreshMapping()
    } catch (err: unknown) {
      showError('Failed to remove KPI', getApiError(err, 'Please try again'))
    }
  }

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
      showError('Failed to delete room', getApiError(err, 'Please try again'))
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
      showError('Failed to update tag', getApiError(err, 'Please try again'))
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* Subtle Room Summary Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <StatChip icon={<FolderIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />} label="Total Rooms" value={totalRoomsCount} />

        <StatChip icon={<span className="w-1.5 h-1.5 rounded-full bg-brand" />} label="Departments" value={topLevelRoomsCount} hint="(Top-level)" />

        <StatChip icon={<UsersIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />} label="Sub-Rooms" value={subRoomsCount} />

        <StatChip icon={<ChartBarIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />} label="Attached KPIs" value={totalKpisCount} />
      </div>

      {/* Toolbar: Search, Filters & View Mode */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search rooms..." />

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Filter tabs */}
          <SegmentedControl
            aria-label="Room filter"
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'all', label: 'All' },
              { value: 'top', label: 'Departments' },
              { value: 'with-kpis', label: 'With KPIs' },
            ]}
          />

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
              title="Room → KPI Mapping"
              aria-label="Room to KPI Mapping"
            >
              <MaskIcon src="/icons/roomtree.svg" className="w-4 h-4" />
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
                ? 'bg-brand text-white shadow-xs font-semibold'
                : 'bg-dark-900 border border-dark-700/80 text-dark-300 hover:text-foreground hover:border-dark-600'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full ${
                selectedTagFilter === null ? 'bg-white/20 text-white' : 'bg-dark-800 text-dark-400'
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
                title={tagDef?.name || colorId}
                aria-label={`Filter by ${tagDef?.name || colorId} tag`}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-dark-800 border text-foreground shadow-xs'
                    : 'bg-dark-900 border border-dark-700/80 text-dark-300 hover:text-foreground hover:border-dark-600'
                }`}
                style={isSelected ? { borderColor: tagDef?.hex || 'currentColor' } : undefined}
              >
                <TagDot color={colorId} />
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
          <Spinner size="lg" />
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
                          <TagDot color={room.color} size="md" empty="ring" />
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
        /* Room → KPI Mapping View (file-tree style: rooms are folders, KPIs are files) */
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-2 font-normal select-none">
          {roomTree.map((node) => (
            <RoomTreeItem
              key={node.id}
              node={node}
              depth={0}
              kpisByRoom={kpisByRoom}
              allKpis={kpis}
              searchQuery={searchQuery.trim().toLowerCase()}
              onNavigate={(id) => navigate(`/rooms/${id}`)}
              onAddSubRoom={(id) => handleOpenCreateModal(id)}
              onDelete={(room) => setRoomToDelete(room)}
              onUpdateColor={handleUpdateRoomColor}
              onAssignKpis={handleAssignKpis}
              onRemoveKpi={handleRemoveKpi}
              isAdmin={isAdmin}
            />
          ))}
          {unassignedKpis.length > 0 && (
            <UnassignedFolder kpis={unassignedKpis} searchQuery={searchQuery.trim().toLowerCase()} />
          )}
        </div>
      )}

      {/* Create Room Modal */}
      <RoomFormModal
        mode="create"
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

/** True when the room, one of its KPIs, or any descendant matches the search query */
function nodeMatches(node: RoomTreeNode, kpisByRoom: Record<string, KPI[]>, q: string): boolean {
  if (!q) return true
  if (node.name.toLowerCase().includes(q)) return true
  if ((kpisByRoom[node.id] || []).some((k) => k.name.toLowerCase().includes(q))) return true
  return node.children.some((c) => nodeMatches(c, kpisByRoom, q))
}

/** A KPI rendered as a file inside its room folder */
function KpiFileRow({ kpi, depth, onRemove }: { kpi: KPI; depth: number; onRemove?: () => void }) {
  return (
    <div className={treeRowClass}>
      <TreeGuides depth={depth} />
      <span className="w-5 flex-shrink-0" />
      <DocumentChartBarIcon className="w-4 h-4 text-dark-400 flex-shrink-0 mr-2" />
      <span className="text-sm text-dark-200 truncate">{kpi.name}</span>
      <span className="ml-2 text-[11px] text-dark-500 capitalize flex-shrink-0">{kpi.category}</span>
      {kpi.is_shared && (
        <span className="ml-1.5 text-[10px] px-1.5 rounded-full bg-dark-800 text-dark-400 flex-shrink-0">shared</span>
      )}
      <span className="flex-1" />
      {kpi.latest_value != null && (
        <span className="text-xs text-dark-400 tabular-nums flex-shrink-0 mr-2">
          {kpi.latest_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      )}
      {onRemove && (
        <div className={rowActionsClass}>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-dark-500 hover:text-danger-400 hover:bg-danger-500/10 rounded transition-colors cursor-pointer"
            title="Unassign KPI from room"
            aria-label={`Unassign ${kpi.name}`}
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

/** Room folder row with its sub-rooms (folders) and KPIs (files) nested beneath */
function RoomTreeItem({
  node,
  depth,
  kpisByRoom,
  allKpis,
  searchQuery,
  onNavigate,
  onAddSubRoom,
  onDelete,
  onUpdateColor,
  onAssignKpis,
  onRemoveKpi,
  isAdmin,
}: {
  node: RoomTreeNode
  depth: number
  kpisByRoom: Record<string, KPI[]>
  allKpis: KPI[]
  searchQuery: string
  onNavigate: (id: string) => void
  onAddSubRoom: (id: string) => void
  onDelete: (room: RoomTreeNode) => void
  onUpdateColor: (roomId: string, color: string | null) => void
  onAssignKpis: (roomId: string, kpiIds: string[]) => Promise<void>
  onRemoveKpi: (roomId: string, kpi: KPI) => Promise<void>
  isAdmin: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const roomKpis = kpisByRoom[node.id] || []
  const assignable = useMemo(() => {
    const assigned = new Set(roomKpis.map((k) => k.id))
    return allKpis.filter((k) => !assigned.has(k.id)).sort((a, b) => a.name.localeCompare(b.name))
  }, [allKpis, roomKpis])

  if (!nodeMatches(node, kpisByRoom, searchQuery)) return null

  // When the room itself matches (or no search), show all its KPIs; otherwise only matching ones
  const roomNameMatches = !searchQuery || node.name.toLowerCase().includes(searchQuery)
  const visibleKpis = roomNameMatches
    ? roomKpis
    : roomKpis.filter((k) => k.name.toLowerCase().includes(searchQuery))
  const hasChildren = node.children && node.children.length > 0
  const isExpandable = hasChildren || roomKpis.length > 0

  return (
    <>
      <div className={treeRowClass}>
        <TreeGuides depth={depth} />
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          onDoubleClick={() => onNavigate(node.id)}
          className="flex items-center flex-1 min-w-0 h-full text-left cursor-pointer"
          title="Click to expand · double-click to open"
        >
          <span className="w-5 flex items-center justify-center flex-shrink-0 text-dark-400">
            {isExpandable &&
              (isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />)}
          </span>
          <span className="relative flex items-center justify-center flex-shrink-0 mr-2">
            <TagFolderIcon color={node.color} open={isExpanded && isExpandable} />
          </span>
          <span className="text-sm font-medium text-foreground truncate">{node.name}</span>
          <span className="ml-2 text-[11px] text-dark-500 flex-shrink-0">
            {roomKpis.length} KPI{roomKpis.length === 1 ? '' : 's'}
            {hasChildren ? ` · ${node.children.length} sub` : ''}
          </span>
        </button>

        {/* Hover actions */}
        <div className={rowActionsClass}>
          <AssignKPIPopover kpis={assignable} onAssign={(ids) => onAssignKpis(node.id, ids)} />
          <TagColorPickerPopover
            selectedColor={node.color}
            onSelectColor={(color) => onUpdateColor(node.id, color)}
            align="right"
          >
            {({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                className="p-1 text-dark-400 hover:text-foreground hover:bg-dark-700 rounded transition-colors cursor-pointer"
                title="Change tag color"
                aria-label="Change tag color"
              >
                <TagIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </TagColorPickerPopover>
          <button
            type="button"
            onClick={() => onAddSubRoom(node.id)}
            className="p-1 text-dark-400 hover:text-foreground hover:bg-dark-700 rounded transition-colors cursor-pointer"
            title="Add sub-room"
            aria-label="Add sub-room"
          >
            <FolderPlusIcon className="w-3.5 h-3.5" />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="p-1 text-dark-500 hover:text-danger-400 hover:bg-danger-500/10 rounded transition-colors cursor-pointer"
              title="Delete room"
              aria-label="Delete room"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate(node.id)}
            className="p-1 text-dark-400 hover:text-foreground hover:bg-dark-700 rounded transition-colors cursor-pointer"
            title="Open room"
            aria-label="Open room"
          >
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Sub-room folders first, then KPI files — like a file explorer */}
          {hasChildren &&
            node.children.map((child) => (
              <RoomTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                kpisByRoom={kpisByRoom}
                allKpis={allKpis}
                searchQuery={searchQuery}
                onNavigate={onNavigate}
                onAddSubRoom={onAddSubRoom}
                onDelete={onDelete}
                onUpdateColor={onUpdateColor}
                onAssignKpis={onAssignKpis}
                onRemoveKpi={onRemoveKpi}
                isAdmin={isAdmin}
              />
            ))}
          {visibleKpis.map((kpi) => (
            <KpiFileRow key={kpi.id} kpi={kpi} depth={depth + 1} onRemove={() => onRemoveKpi(node.id, kpi)} />
          ))}
        </>
      )}
    </>
  )
}

/** Virtual folder holding KPIs that are not mapped to any room */
function UnassignedFolder({ kpis, searchQuery }: { kpis: KPI[]; searchQuery: string }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const visible = searchQuery ? kpis.filter((k) => k.name.toLowerCase().includes(searchQuery)) : kpis
  if (visible.length === 0) return null
  const FolderGlyph = isExpanded ? FolderOpenIcon : FolderIcon

  return (
    <>
      <div className={`${treeRowClass} mt-1 pt-1 border-t border-dark-700/60 rounded-t-none`}>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center flex-1 min-w-0 h-full text-left cursor-pointer"
        >
          <span className="w-5 flex items-center justify-center flex-shrink-0 text-dark-400">
            {isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
          </span>
          <FolderGlyph className="h-4 w-4 text-dark-500 flex-shrink-0 mr-2" />
          <span className="text-sm font-medium text-dark-300 italic truncate">Unassigned</span>
          <span className="ml-2 text-[11px] text-dark-500 flex-shrink-0">
            {visible.length} KPI{visible.length === 1 ? '' : 's'} · not in any room
          </span>
        </button>
      </div>
      {isExpanded && visible.map((kpi) => <KpiFileRow key={kpi.id} kpi={kpi} depth={1} />)}
    </>
  )
}
