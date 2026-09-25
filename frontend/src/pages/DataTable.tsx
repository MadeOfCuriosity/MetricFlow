import { useState, useEffect, useMemo } from 'react'
import { PlusIcon, CircleStackIcon, ArrowUpTrayIcon, FolderIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { SpreadsheetView } from '../components/SpreadsheetView'
import { CSVImportModal } from '../components/CSVImportModal'
import { DataFieldFormModal } from '../components/DataFieldFormModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import { useToast } from '../context/ToastContext'
import { useRoom } from '../context/RoomContext'
import { dataFieldsApi } from '../services/dataFields'
import type { DataField } from '../types/dataField'
import type { RoomTreeNode } from '../types/room'
import { getApiError } from '../lib/apiError'
import { SearchInput } from '../components/ui/SearchInput'
import { StatChip } from '../components/ui/StatChip'

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
  const { success, error: showError } = useToast()
  const { roomTree } = useRoom()
  const flatRooms = useMemo(() => flattenTree(roomTree), [roomTree])

  const [dataFields, setDataFields] = useState<DataField[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  // Store the id (not the object) so a click before the field list loads still opens once it arrives
  const [openFieldId, setOpenFieldId] = useState<string | null>(null)
  const [fieldToDelete, setFieldToDelete] = useState<DataField | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    dataFieldsApi
      .getAll()
      .then((data) => setDataFields(data.data_fields))
      .catch((err) => console.error('Failed to fetch data fields:', err))
  }, [refreshKey])

  const refresh = () => setRefreshKey((k) => k + 1)

  const handleSaved = (field: DataField) => {
    setIsCreateModalOpen(false)
    setOpenFieldId(null)
    refresh()
    success('Data field saved', `"${field.name}" has been saved.`)
  }

  const handleDelete = async () => {
    if (!fieldToDelete) return
    setIsDeleting(true)
    try {
      await dataFieldsApi.delete(fieldToDelete.id)
      success('Data field deleted', `"${fieldToDelete.name}" has been removed.`)
      setFieldToDelete(null)
      refresh()
    } catch (err: unknown) {
      showError('Cannot delete', getApiError(err, 'Failed to delete data field'))
    } finally {
      setIsDeleting(false)
    }
  }

  const openField = useMemo(
    () => (openFieldId ? dataFields.find((f) => f.id === openFieldId) ?? null : null),
    [openFieldId, dataFields]
  )

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
            Enter and review metrics in a fast multi-cell spreadsheet view. Click a field name for details.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Create Field</span>
          </button>
        </div>
      </div>

      {/* Subtle Summary Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <StatChip icon={<CircleStackIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />} label="Total Fields" value={totalFieldsCount} />

        <StatChip icon={<FolderIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />} label="Assigned" value={assignedFieldsCount} />

        <StatChip icon={<span className="w-1.5 h-1.5 rounded-full bg-success-400" />} label="Daily" value={dailyFieldsCount} />

        <StatChip icon={<CalendarDaysIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />} label="Weekly/Monthly" value={periodicFieldsCount} />
      </div>

      {/* Toolbar: Search & Room Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search data fields by name or variable..." />

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
                {'— '.repeat(room.depth)}{room.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SpreadsheetView
        key={refreshKey}
        searchQuery={searchQuery}
        selectedRoom={selectedRoom}
        onFieldClick={setOpenFieldId}
      />

      {/* Create, or view & edit in place */}
      <DataFieldFormModal
        isOpen={isCreateModalOpen || !!openField}
        onClose={() => {
          setIsCreateModalOpen(false)
          setOpenFieldId(null)
        }}
        onCreated={handleSaved}
        editField={isCreateModalOpen ? null : openField}
        onDelete={(field) => {
          setOpenFieldId(null)
          setFieldToDelete(field)
        }}
      />

      {/* Delete Confirmation */}
      {fieldToDelete && (
        <DeleteConfirmModal
          isOpen={!!fieldToDelete}
          onClose={() => setFieldToDelete(null)}
          onConfirm={handleDelete}
          title="Delete Data Field"
          message={`Are you sure you want to delete "${fieldToDelete.name}"? This action cannot be undone.${
            fieldToDelete.kpi_count > 0
              ? ` This field is used by ${fieldToDelete.kpi_count} KPI(s) and cannot be deleted while in use.`
              : ''
          }`}
          isDeleting={isDeleting}
        />
      )}

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={refresh}
      />
    </div>
  )
}
