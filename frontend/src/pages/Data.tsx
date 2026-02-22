import { useState, useEffect, useMemo } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
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

  // Filter data fields
  const filteredFields = dataFields.filter(field => {
    const matchesSearch = !searchQuery ||
      field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.variable_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRoom = selectedRoom === 'all' ||
      (selectedRoom === 'unassigned' && !field.room_id) ||
      field.room_id === selectedRoom
    return matchesSearch && matchesRoom
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Fields</h1>
          <p className="text-dark-300 mt-1">
            Manage reusable data fields across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-dark-600 text-dark-200 hover:text-foreground hover:border-dark-500 rounded-lg transition-colors"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Import CSV
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Data Field
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search data fields..."
            className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-dark-400" />
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredFields.length === 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
          <CircleStackIcon className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {dataFields.length === 0 ? 'No data fields yet' : 'No matching data fields'}
          </h2>
          <p className="text-dark-300 mb-4">
            {dataFields.length === 0
              ? 'Data fields are created automatically when you create KPIs, or you can create them manually.'
              : 'Try adjusting your search or filters.'}
          </p>
          {dataFields.length === 0 && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create Data Field
            </button>
          )}
        </div>
      )}

      {/* Data fields table */}
      {!isLoading && filteredFields.length > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">Variable</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">Interval</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">KPIs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">Latest Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredFields.map((field) => (
                  <tr key={field.id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{field.name}</p>
                        {field.description && (
                          <p className="text-xs text-dark-400 mt-0.5 truncate max-w-[200px]">{field.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">
                        {field.variable_name}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {field.room_path ? (
                        <span className="text-sm text-foreground">{field.room_path}</span>
                      ) : (
                        <span className="text-sm text-dark-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-dark-300">{field.unit || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        field.entry_interval === 'daily' ? 'bg-primary-500/10 text-primary-400' :
                        field.entry_interval === 'weekly' ? 'bg-success-500/10 text-success-400' :
                        field.entry_interval === 'monthly' ? 'bg-warning-500/10 text-warning-400' :
                        'bg-dark-600 text-dark-300'
                      }`}>
                        {field.entry_interval ? field.entry_interval.charAt(0).toUpperCase() + field.entry_interval.slice(1) : 'Daily'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">{field.kpi_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      {field.latest_value !== null ? (
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            {field.unit === '$' ? '$' : ''}{field.latest_value.toLocaleString()}{field.unit === '%' ? '%' : ''}
                          </span>
                          {field.latest_date && (
                            <span className="text-xs text-dark-400 ml-1">
                              ({new Date(field.latest_date).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-dark-400">No data</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditField(field)}
                          className="p-1.5 text-dark-300 hover:text-foreground hover:bg-dark-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setFieldToDelete(field)}
                          className="p-1.5 text-dark-300 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors"
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
          <div className="px-4 py-3 border-t border-dark-700">
            <p className="text-sm text-dark-400">
              {filteredFields.length} of {dataFields.length} data field{dataFields.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <DataFieldFormModal
        isOpen={isCreateModalOpen || !!editField}
        onClose={() => { setIsCreateModalOpen(false); setEditField(null) }}
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
            fieldToDelete.kpi_count > 0 ? ` This field is used by ${fieldToDelete.kpi_count} KPI(s) and cannot be deleted while in use.` : ''
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
