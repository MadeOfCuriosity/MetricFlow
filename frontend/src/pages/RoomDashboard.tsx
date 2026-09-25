import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ChartBarIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  FolderPlusIcon,
  SparklesIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { KPICard, TrendChart, DateRangeSelector, getPresetLabel } from '../components'
import type { DateRange, DateRangePreset } from '../components'
import { roomsApi } from '../services/rooms'
import api from '../services/api'
import { RoomDashboardResponse, KPI, AggregatedKPI, Room } from '../types/room'
import { useRoom } from '../context/RoomContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { RoomFormModal } from '../components/RoomFormModal'
import { TagColorPickerPopover } from '../components/TagColorPickerPopover'
import { AggregatedKPICard } from '../components/AggregatedKPICard'
import { resolveRoomColor } from '../constants/tagColors'
import { TagDot } from '../components/ui/Tag'
import { getApiError } from '../lib/apiError'
import { Spinner } from '../components/ui/Spinner'

interface DataEntry {
  id: string
  date: string
  values: Record<string, number>
  calculated_value: number
}

interface KPIWithEntries extends KPI {
  entries: DataEntry[]
  currentValue: number | null
  previousValue: number | null
}

export function RoomDashboard() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { rooms, deleteRoom, updateRoom, fetchRoomTree } = useRoom()
  const { success: showSuccess, error: showErrorToast } = useToast()
  const { isAdmin } = useAuth()
  const [dashboardData, setDashboardData] = useState<RoomDashboardResponse | null>(null)
  const [roomKpisWithEntries, setRoomKpisWithEntries] = useState<KPIWithEntries[]>([])
  const [subRoomKpisWithEntries, setSubRoomKpisWithEntries] = useState<KPIWithEntries[]>([])
  const [sharedKpisWithEntries, setSharedKpisWithEntries] = useState<KPIWithEntries[]>([])
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  const [selectedAggKPI, setSelectedAggKPI] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreateSubRoomOpen, setIsCreateSubRoomOpen] = useState(false)
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const [activePreset, setActivePreset] = useState<DateRangePreset>('monthly')

  const handleTagColorChange = async (newColor: string | null) => {
    if (!roomId || !dashboardData) return
    try {
      await updateRoom(roomId, { color: newColor })
      setDashboardData((prev) =>
        prev
          ? {
              ...prev,
              room: {
                ...prev.room,
                color: newColor,
              },
            }
          : null
      )
      showSuccess(
        newColor ? 'Tag color updated' : 'Tag color removed',
        newColor ? `Room tagged as ${newColor}` : 'Default obsidian folder restored'
      )
    } catch (err: unknown) {
      showErrorToast('Failed to update tag', getApiError(err, 'Please try again'))
    }
  }

  const handleRoomUpdated = (updatedRoom: Room) => {
    setDashboardData((prev) =>
      prev
        ? {
            ...prev,
            room: {
              ...prev.room,
              name: updatedRoom.name,
              description: updatedRoom.description,
              color: updatedRoom.color,
            },
          }
        : null
    )
    showSuccess('Room updated', `"${updatedRoom.name}" has been updated`)
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await roomsApi.getRoomDashboard(roomId)
        setDashboardData(data)

        // Fetch entries for room KPIs
        const roomKpisData = await Promise.all(
          data.room_kpis.map(async (kpi) => {
            try {
              const entriesRes = await api.get(`/api/entries?kpi_id=${kpi.id}&limit=365`)
              const entriesData = entriesRes.data
              const entries = (Array.isArray(entriesData) ? entriesData : entriesData?.entries ?? []) as DataEntry[]
              return {
                ...kpi,
                entries,
                currentValue: entries[0]?.calculated_value ?? null,
                previousValue: entries[1]?.calculated_value ?? null,
              }
            } catch {
              return {
                ...kpi,
                entries: [],
                currentValue: null,
                previousValue: null,
              }
            }
          })
        )
        setRoomKpisWithEntries(roomKpisData)

        // Fetch entries for sub-room KPIs (rolled up to parent room)
        const subRoomKpisData = await Promise.all(
          (data.sub_room_kpis || []).map(async (kpi) => {
            try {
              const entriesRes = await api.get(`/api/entries?kpi_id=${kpi.id}&limit=365`)
              const entriesData = entriesRes.data
              const entries = (Array.isArray(entriesData) ? entriesData : entriesData?.entries ?? []) as DataEntry[]
              return {
                ...kpi,
                entries,
                currentValue: entries[0]?.calculated_value ?? null,
                previousValue: entries[1]?.calculated_value ?? null,
              }
            } catch {
              return {
                ...kpi,
                entries: [],
                currentValue: null,
                previousValue: null,
              }
            }
          })
        )
        setSubRoomKpisWithEntries(subRoomKpisData)

        // Fetch entries for shared KPIs
        const sharedKpisData = await Promise.all(
          data.shared_kpis.map(async (kpi) => {
            try {
              const entriesRes = await api.get(`/api/entries?kpi_id=${kpi.id}&limit=365`)
              const entriesData = entriesRes.data
              const entries = (Array.isArray(entriesData) ? entriesData : entriesData?.entries ?? []) as DataEntry[]
              return {
                ...kpi,
                entries,
                currentValue: entries[0]?.calculated_value ?? null,
                previousValue: entries[1]?.calculated_value ?? null,
              }
            } catch {
              return {
                ...kpi,
                entries: [],
                currentValue: null,
                previousValue: null,
              }
            }
          })
        )
        setSharedKpisWithEntries(sharedKpisData)

        // Select first KPI by default (prefer aggregated if available)
        const aggKpis = data.aggregated_kpis || []
        const allFetchedKpis = [...roomKpisData, ...subRoomKpisData, ...sharedKpisData]
        if (aggKpis.length > 0) {
          setSelectedAggKPI(aggKpis[0].kpi.id)
          setSelectedKPI(null)
        } else if (allFetchedKpis.length > 0) {
          setSelectedKPI(allFetchedKpis[0].id)
          setSelectedAggKPI(null)
        }
      } catch (err) {
        console.error('Failed to fetch room dashboard:', err)
        setError('Failed to load room dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [roomId])

  const handleDeleteRoom = async () => {
    if (!roomId || !dashboardData) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${dashboardData.room.name}"? This will also delete all sub-rooms.`
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteRoom(roomId)
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to delete room:', err)
      setError('Failed to delete room')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubRoomCreated = (newRoomId: string) => {
    setIsCreateSubRoomOpen(false)
    fetchRoomTree()
    navigate(`/rooms/${newRoomId}`)
  }

  const handleDateRangeChange = (range: DateRange, preset?: DateRangePreset) => {
    setDateRange(range)
    if (preset) setActivePreset(preset)
  }

  const filterEntriesByRange = (entries: DataEntry[]) => {
    if (!dateRange.startDate && !dateRange.endDate) return entries
    return entries.filter((e) => {
      if (dateRange.startDate && e.date < dateRange.startDate) return false
      if (dateRange.endDate && e.date > dateRange.endDate) return false
      return true
    })
  }

  const allKpis = [...roomKpisWithEntries, ...subRoomKpisWithEntries, ...sharedKpisWithEntries]
  const aggregatedKpis: AggregatedKPI[] = dashboardData?.aggregated_kpis || []

  // KPIs shown here take this room's tag (own color, else nearest tagged ancestor),
  // the same rule the KPIs page uses.
  const roomColor = dashboardData
    ? dashboardData.room.color || resolveRoomColor(dashboardData.room.id, rooms)
    : null
  const subRoomColors = Object.fromEntries(rooms.map((r) => [r.id, resolveRoomColor(r.id, rooms)]))

  // Determine chart data source: either a regular KPI or an aggregated one
  const selectedKPIData = allKpis.find((k) => k.id === selectedKPI)
  const selectedAggData = aggregatedKpis.find((a) => a.kpi.id === selectedAggKPI)

  let chartData: { date: string; value: number }[] = []
  let chartTitle = 'Select a KPI'
  let chartCurrentValue: number | null = null

  if (selectedAggKPI && selectedAggData) {
    // Aggregated KPI selected
    const aggEntries = selectedAggData.recent_entries.filter((e) => {
      if (dateRange.startDate && e.date < dateRange.startDate) return false
      if (dateRange.endDate && e.date > dateRange.endDate) return false
      return true
    })
    chartData = aggEntries.slice().reverse().map((e) => ({ date: e.date, value: e.aggregated_value }))
    chartTitle = `${selectedAggData.kpi.name} (${selectedAggData.aggregation_method.toUpperCase()})`
    chartCurrentValue = selectedAggData.current_aggregated_value
  } else if (selectedKPI && selectedKPIData) {
    // Regular KPI selected
    const filteredEntries = filterEntriesByRange(selectedKPIData.entries)
    chartData = filteredEntries.slice().reverse().map((e) => ({ date: e.date, value: e.calculated_value }))
    chartTitle = selectedKPIData.name
    chartCurrentValue = selectedKPIData.currentValue
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="xl" />
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger-400 mb-4">{error || 'Room not found'}</p>
          <Link to="/dashboard" className="text-brand hover:text-brand">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-dark-300">
        <Link to="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        {dashboardData.breadcrumbs.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center">
            <ChevronRightIcon className="w-4 h-4 mx-2" />
            {index === dashboardData.breadcrumbs.length - 1 ? (
              <span className="text-foreground font-medium">{crumb.name}</span>
            ) : (
              <Link to={`/rooms/${crumb.id}`} className="hover:text-foreground transition-colors">
                {crumb.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Room header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {/* Clickable macOS tag dot or add-tag trigger */}
            <TagColorPickerPopover
              selectedColor={dashboardData.room.color}
              onSelectColor={handleTagColorChange}
              align="left"
            >
              {({ toggle }) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(e)
                  }}
                  className="relative p-1.5 rounded-full hover:bg-dark-800 transition-all cursor-pointer flex items-center justify-center"
                  title={dashboardData.room.color ? 'Change tag color' : 'Add tag color'}
                  aria-label="Change room tag color"
                >
                  <TagDot color={dashboardData.room.color} size="lg" empty="ring" />
                </button>
              )}
            </TagColorPickerPopover>

            <h1 className="text-2xl font-bold text-foreground">{dashboardData.room.name}</h1>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditRoomOpen(true)}
                className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                title="Edit Room"
                aria-label="Edit Room"
              >
                <PencilSquareIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          {dashboardData.room.description && (
            <p className="text-dark-300 mt-1">{dashboardData.room.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate(`/rooms/${roomId}/ai-builder`)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-brand hover:text-brand bg-brand/10 hover:bg-brand/20 rounded-lg transition-colors cursor-pointer"
            title="Create KPI"
          >
            <SparklesIcon className="w-4 h-4" />
            Create KPI
          </button>
          {/* Show Add Sub-Room for admins on any room */}
          {isAdmin && (
            <button
              onClick={() => setIsCreateSubRoomOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-dark-200 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
              title="Add Sub-Room"
            >
              <FolderPlusIcon className="w-4 h-4" />
              Add Sub-Room
            </button>
          )}
          {/* Edit room for admin */}
          {isAdmin && (
            <button
              onClick={() => setIsEditRoomOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-dark-200 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
              title="Edit Room Details"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Edit
            </button>
          )}
          {/* Only leaf rooms (no children) can be deleted */}
          {(isAdmin || dashboardData.room.parent_room_id) && dashboardData.room.sub_room_count === 0 && (
            <button
              onClick={handleDeleteRoom}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              title="Delete Room"
            >
              <TrashIcon className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Date range selector */}
      <DateRangeSelector
        defaultPreset="monthly"
        onChange={(range, preset) => handleDateRangeChange(range, preset)}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{roomKpisWithEntries.length}</p>
              <p className="text-xs text-dark-400">Room KPIs</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dark-800 border border-dark-700 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-dark-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sharedKpisWithEntries.length}</p>
              <p className="text-xs text-dark-400">Shared KPIs</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dark-800 border border-dark-700 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-dark-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{dashboardData.room.sub_room_count}</p>
              <p className="text-xs text-dark-400">Sub-Rooms</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dark-800 border border-dark-700 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-dark-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{allKpis.length + aggregatedKpis.length}</p>
              <p className="text-xs text-dark-400">Total KPIs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Room-specific KPIs */}
      {roomKpisWithEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Room KPIs</h2>
            <span className="text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded">
              Assigned to this room
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {roomKpisWithEntries.map((kpi) => {
              const rangeEntries = filterEntriesByRange(kpi.entries)
              return (
                <KPICard
                  key={kpi.id}
                  roomColor={roomColor}
                  roomName={dashboardData.room.name}
                  kpiId={kpi.id}
                  name={kpi.name}
                  value={rangeEntries[0]?.calculated_value ?? null}
                  previousValue={rangeEntries[1]?.calculated_value ?? null}
                  category={kpi.category}
                  sparklineData={rangeEntries
                    .slice(0, 7)
                    .reverse()
                    .map((e) => ({ value: e.calculated_value }))}
                  onClick={() => { setSelectedKPI(kpi.id); setSelectedAggKPI(null) }}
                  isSelected={selectedKPI === kpi.id}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Aggregated KPIs (summed/averaged from sub-rooms) */}
      {aggregatedKpis.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Aggregated KPIs</h2>
            <span className="text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded">
              Combined from sub-rooms
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {aggregatedKpis.map((aggKpi) => (
              <AggregatedKPICard
                key={`agg-${aggKpi.kpi.id}`}
                aggregatedKpi={aggKpi}
                onClick={() => { setSelectedAggKPI(aggKpi.kpi.id); setSelectedKPI(null) }}
                isSelected={selectedAggKPI === aggKpi.kpi.id}
                roomColor={roomColor}
                roomName={dashboardData.room.name}
                subRoomColors={subRoomColors}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sub-room KPIs (rolled up from sub-rooms) */}
      {subRoomKpisWithEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Sub-room KPIs</h2>
            <span className="text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded">
              From all sub-rooms
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subRoomKpisWithEntries.map((kpi) => {
              const rangeEntries = filterEntriesByRange(kpi.entries)
              return (
                <KPICard
                  key={kpi.id}
                  roomColor={kpi.room_color || roomColor}
                  roomName={kpi.room_name}
                  kpiId={kpi.id}
                  name={kpi.name}
                  value={rangeEntries[0]?.calculated_value ?? null}
                  previousValue={rangeEntries[1]?.calculated_value ?? null}
                  category={kpi.category}
                  sparklineData={rangeEntries
                    .slice(0, 7)
                    .reverse()
                    .map((e) => ({ value: e.calculated_value }))}
                  onClick={() => { setSelectedKPI(kpi.id); setSelectedAggKPI(null) }}
                  isSelected={selectedKPI === kpi.id}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Shared KPIs */}
      {sharedKpisWithEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Shared Organization KPIs</h2>
            <span className="text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded">
              Visible in all rooms
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sharedKpisWithEntries.map((kpi) => {
              const rangeEntries = filterEntriesByRange(kpi.entries)
              return (
                <KPICard
                  key={kpi.id}
                  roomColor={kpi.room_color}
                  roomName={kpi.room_name}
                  kpiId={kpi.id}
                  name={kpi.name}
                  value={rangeEntries[0]?.calculated_value ?? null}
                  previousValue={rangeEntries[1]?.calculated_value ?? null}
                  category={kpi.category}
                  sparklineData={rangeEntries
                    .slice(0, 7)
                    .reverse()
                    .map((e) => ({ value: e.calculated_value }))}
                  onClick={() => { setSelectedKPI(kpi.id); setSelectedAggKPI(null) }}
                  isSelected={selectedKPI === kpi.id}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Trend chart */}
      {(allKpis.length > 0 || aggregatedKpis.length > 0) && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {chartTitle}
              </h2>
              <p className="text-sm text-dark-400">{getPresetLabel(activePreset)}</p>
            </div>
            {chartCurrentValue !== null && (
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  {chartCurrentValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-sm text-dark-400">Current value</p>
              </div>
            )}
          </div>

          {chartData.length > 0 ? (
            <TrendChart data={chartData} kpiName={chartTitle} height={280} />
          ) : (
            <div className="flex items-center justify-center h-[280px] bg-dark-800/30 rounded-lg">
              <div className="text-center">
                <ChartBarIcon className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400">No data to display</p>
                <Link
                  to="/entries"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-brand hover:text-brand"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add your first entry
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {allKpis.length === 0 && aggregatedKpis.length === 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
          <ChartBarIcon className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No KPIs in this room</h2>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">
            Create KPIs for this room to start tracking department-specific metrics.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate(`/rooms/${roomId}/ai-builder`)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              <SparklesIcon className="w-5 h-5" />
              Create KPI with AI
            </button>
          </div>
        </div>
      )}

      {/* Create Sub-Room Modal */}
      <RoomFormModal
        mode="create"
        isOpen={isCreateSubRoomOpen}
        onClose={() => setIsCreateSubRoomOpen(false)}
        onCreated={handleSubRoomCreated}
        parentRoomId={roomId}
      />

      {/* Edit Room Modal */}
      {dashboardData && (
        <RoomFormModal
          mode="edit"
          isOpen={isEditRoomOpen}
          onClose={() => setIsEditRoomOpen(false)}
          room={dashboardData.room}
          onUpdated={handleRoomUpdated}
        />
      )}

    </div>
  )
}
