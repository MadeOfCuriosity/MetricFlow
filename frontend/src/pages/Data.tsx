import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'
import { DataFieldFormModal } from '../components/DataFieldFormModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import { CSVImportModal } from '../components/CSVImportModal'
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

export function Data() {
  const { success, error: showError } = useToast()
  const { roomTree } = useRoom()
  const navigate = useNavigate()

  const [dataFields, setDataFields] = useState<DataField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editField, setEditField] = useState<DataField | null>(null)
  const [fieldToDelete, setFieldToDelete] = useState<DataField | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const flatRooms = useMemo(() => flattenTree(roomTree), [roomTree])

  useEffect(() => {
    fetchDataFields()
  }, [])

  const fetchDataFields = async () => {
    setIsLoading(true)
    try {
      const data = await dataFieldsApi.getAll()
      setDataFields(data.data_fields)
    } catch (err) {
      console.error('Failed to fetch data fields:', err)
      showError('Failed to load data fields')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreated = (field: DataField) => {
    setIsCreateModalOpen(false)
    setEditField(null)
    fetchDataFields()
    success('Data field saved', `"${field.name}" has been saved.`)
  }

  const handleDelete = async () => {
    if (!fieldToDelete) return
    setIsDeleting(true)
    try {
      await dataFieldsApi.delete(fieldToDelete.id)
      setFieldToDelete(null)
      fetchDataFields()
      success('Data field deleted', `"${fieldToDelete.name}" has been removed.`)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      showError('Cannot delete', error.response?.data?.detail || 'Failed to delete data field')
    } finally {
      setIsDeleting(false)
    }
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

  // Filter data fields
  const filteredFields = useMemo(() => {
    return dataFields.filter((field) => {
      const matchesSearch =
        !searchQuery ||
        field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.variable_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (field.description && field.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesRoom =
        selectedRoom === 'all' ||
        (selectedRoom === 'unassigned' && field.room_ids.length === 0) ||
        field.room_ids.includes(selectedRoom)

      return matchesSearch && matchesRoom
    })
  }, [dataFields, searchQuery, selectedRoom])

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Fields</h1>
          <p className="text-dark-300 mt-1 text-sm">
            Manage reusable data inputs, tracking frequencies, and attached metric fields.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View switch */}
          <div className="flex items-center p-1 bg-dark-900 border border-dark-700 rounded-xl">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer bg-dark-800 text-foreground shadow-sm"
            >
              <ListBulletIcon className="w-3.5 h-3.5" />
              <span>Data Fields</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/data-table')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-dark-400 hover:text-foreground"
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

      {/* Toolbar: Search, Room Dropdown & Interval Filter Segment */}
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

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {/* Room Selector */}
          <div className="relative">
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              aria-label="Filter by room"
              className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-xs text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
            >
              <option value="all">All Rooms</option>
              <option value="unassigned">Unassigned</option>
              {flatRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {'—\u00A0'.repeat(room.depth)}{room.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-dark-900 border border-dark-700 rounded-2xl p-4 animate-pulse">
              <div className="h-4 w-40 bg-dark-800 rounded mb-2" />
              <div className="h-3 w-64 bg-dark-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredFields.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/40 border border-dashed border-dark-700/80 rounded-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-3">
            <CircleStackIcon className="w-7 h-7 text-dark-400 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {dataFields.length === 0 ? 'No data fields found' : 'No matching data fields'}
          </h3>
          <p className="text-xs text-dark-300 max-w-sm mb-5">
            {dataFields.length === 0
              ? 'Data fields are created automatically when formulas are added, or you can create one manually.'
              : 'Try clearing your filters or search keywords.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dark-800 border border-dark-700 text-dark-200 hover:text-foreground hover:bg-dark-700 transition-colors text-xs font-medium cursor-pointer"
            >
              <ArrowUpTrayIcon className="w-3.5 h-3.5" />
              <span>Import CSV / Excel</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-xs shadow-sm cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Data Field</span>
            </button>
          </div>
        </div>
      )}

      {/* Data fields table */}
      {!isLoading && filteredFields.length > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-700/80 bg-dark-950/40 text-[11px] font-semibold text-dark-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Variable</th>
                  <th className="px-4 py-3.5">Rooms</th>
                  <th className="px-4 py-3.5">Unit</th>
                  <th className="px-4 py-3.5">Frequency</th>
                  <th className="px-4 py-3.5">KPIs</th>
                  <th className="px-4 py-3.5">Latest Value</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 text-sm">
                {filteredFields.map((field) => (
                  <tr key={field.id} className="hover:bg-dark-800/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-foreground text-sm group-hover:text-primary-400 transition-colors">
                          {field.name}
                        </p>
                        {field.description && (
                          <p className="text-xs text-dark-400 mt-0.5 truncate max-w-[220px]">
                            {field.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-[11px] font-mono text-dark-300 bg-dark-950 px-2 py-0.5 rounded-md border border-dark-800">
                        {field.variable_name}
                      </code>
                    </td>
                    <td className="px-4 py-3.5">
                      {field.room_paths && field.room_paths.length > 0 ? (
                        <span className="text-xs text-dark-300">{field.room_paths.join(', ')}</span>
                      ) : (
                        <span className="text-xs text-dark-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-dark-300 font-medium">{field.unit || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          field.entry_interval === 'weekly'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : field.entry_interval === 'monthly'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : field.entry_interval === 'custom'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {field.entry_interval || 'daily'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-foreground">{field.kpi_count}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {field.latest_value !== null ? (
                        <div>
                          <span className="text-xs font-semibold text-foreground">
                            {field.unit === '$' ? '$' : ''}
                            {field.latest_value.toLocaleString()}
                            {field.unit === '%' ? '%' : ''}
                          </span>
                          {field.latest_date && (
                            <span className="text-[10px] text-dark-400 ml-1.5 font-normal">
                              ({new Date(field.latest_date).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-dark-500">No data</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditField(field)}
                          className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFieldToDelete(field)}
                          className="p-1.5 text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-dark-950/40 border-t border-dark-800 flex items-center justify-between text-xs text-dark-400">
            <span>
              Showing {filteredFields.length} of {dataFields.length} total field{dataFields.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <DataFieldFormModal
        isOpen={isCreateModalOpen || !!editField}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditField(null)
        }}
        onCreated={handleCreated}
        editField={editField}
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
        onImported={fetchDataFields}
      />
    </div>
  )
}
