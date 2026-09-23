import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'
import { SpreadsheetView } from '../components/SpreadsheetView'
import { CSVImportModal } from '../components/CSVImportModal'
import { DataFieldFormModal } from '../components/DataFieldFormModal'
import { useToast } from '../context/ToastContext'
import { useRoom } from '../context/RoomContext'
import { dataFieldsApi } from '../services/dataFields'
import type { DataField } from '../types/dataField'
import type { RoomTreeNode } from '../types/room'

interface FlatRoomOption {
  id: string
  name: string
  depth: number
}

function flattenTree(nodes: RoomTreeNode[], depth = 0): FlatRoomOption[] {
  const result: FlatRoomOption[] = []
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth })
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  }
  return result
}

export function DataTable() {
  const navigate = useNavigate()
  const { success } = useToast()
  const { roomTree } = useRoom()
  const flatRooms = useMemo(() => flattenTree(roomTree), [roomTree])

  const [dataFields, setDataFields] = useState<DataField[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    dataFieldsApi
      .getAll()
      .then((data) => setDataFields(data.data_fields))
      .catch((err) => console.error('Failed to fetch data fields:', err))
  }, [refreshKey])

  const handleCreated = (field: DataField) => {
    setIsCreateModalOpen(false)
    setRefreshKey((k) => k + 1)
    success('Data field saved', `"${field.name}" has been saved.`)
  }

  // Summary Metrics
  const totalFieldsCount = dataFields.length
  const assignedFieldsCount = useMemo(
    () => dataFields.filter((f) => f.room_ids && f.room_ids.length > 0).length,
    [dataFields]
  )
  const dailyFieldsCount = useMemo(
    () => dataFields.filter((f) => !f.entry_interval || f.entry_interval === 'daily').length,
    [dataFields]
  )
  const periodicFieldsCount = totalFieldsCount - dailyFieldsCount

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Table</h1>
          <p className="text-dark-300 mt-1 text-sm">
            Enter and review metrics in a fast multi-cell spreadsheet view.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View switch */}
          <div className="flex items-center p-1 bg-dark-900 border border-dark-700 rounded-xl">
            <button
              type="button"
              onClick={() => navigate('/data')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-dark-400 hover:text-foreground"
            >
              <ListBulletIcon className="w-3.5 h-3.5" />
              <span>Data Fields</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer bg-dark-800 text-foreground shadow-sm"
            >
              <TableCellsIcon className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-dark-200 hover:text-foreground hover:border-dark-600 transition-colors text-sm cursor-pointer shadow-sm"
          >
            <ArrowUpTrayIcon className="w-4 h-4 stroke-[2]" />
            <span>Import CSV / Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Create Field</span>
          </button>
        </div>
      </div>

      {/* Subtle Summary Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <CircleStackIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Total Fields:</span>
          <span className="font-semibold text-foreground">{totalFieldsCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <FolderIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Assigned:</span>
          <span className="font-semibold text-foreground">{assignedFieldsCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-dark-400">Daily:</span>
          <span className="font-semibold text-foreground">{dailyFieldsCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <CalendarDaysIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Weekly/Monthly:</span>
          <span className="font-semibold text-foreground">{periodicFieldsCount}</span>
        </div>
      </div>

      {/* Toolbar: Search & Room Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search data fields by name or variable..."
            className="w-full pl-9 pr-4 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
          />
        </div>

        {/* Room Selector */}
        <div className="relative">
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            aria-label="Filter by room"
            className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-xs text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
          >
            <option value="all">All Rooms</option>
            {flatRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {'— '.repeat(room.depth)}{room.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SpreadsheetView key={refreshKey} searchQuery={searchQuery} selectedRoom={selectedRoom} />

      {/* Create Field Modal */}
      <DataFieldFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreated}
        editField={null}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
