import { useState, useEffect, useMemo, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import type { RoomTreeNode } from '../types/room'
import type { DataField, CreateDataFieldData, EntryInterval } from '../types/dataField'

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

interface DataFieldFormModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (field: DataField) => void
  editField?: DataField | null
}

function generateVariableName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase() || 'unnamed_field'
}

export function DataFieldFormModal({ isOpen, onClose, onCreated, editField }: DataFieldFormModalProps) {
  const { roomTree } = useRoom()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [entryInterval, setEntryInterval] = useState<EntryInterval>('daily')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const flatRooms = useMemo(() => flattenTree(roomTree), [roomTree])

  useEffect(() => {
    if (editField) {
      setName(editField.name)
      setDescription(editField.description || '')
      setUnit(editField.unit || '')
      setSelectedRoomId(editField.room_id || '')
      setEntryInterval(editField.entry_interval || 'daily')
    } else {
      setName('')
      setDescription('')
      setUnit('')
      setSelectedRoomId('')
      setEntryInterval('daily')
    }
  }, [editField, isOpen])

  const variablePreview = generateVariableName(name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { dataFieldsApi } = await import('../services/dataFields')

      if (editField) {
        const updated = await dataFieldsApi.update(editField.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          unit: unit.trim() || undefined,
          room_id: selectedRoomId || undefined,
          entry_interval: entryInterval,
        })
        onCreated(updated)
      } else {
        const data: CreateDataFieldData = {
          name: name.trim(),
          description: description.trim() || undefined,
          unit: unit.trim() || undefined,
          room_id: selectedRoomId || undefined,
          entry_interval: entryInterval,
        }
        const created = await dataFieldsApi.create(data)
        onCreated(created)
      }

      handleClose()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Failed to save data field')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setUnit('')
    setSelectedRoomId('')
    setEntryInterval('daily')
    setError(null)
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-dark-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    {editField ? 'Edit Data Field' : 'Create Data Field'}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-dark-300 hover:text-foreground transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="df-name" className="block text-sm font-medium text-dark-200 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="df-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Revenue, Deals Closed, Marketing Spend"
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      minLength={1}
                      maxLength={255}
                    />
                    {name.trim() && (
                      <p className="mt-1 text-xs text-dark-400">
                        Variable name: <code className="text-primary-400">{variablePreview}</code>
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="df-room" className="block text-sm font-medium text-dark-200 mb-1">
                      Room
                    </label>
                    <select
                      id="df-room"
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">No room (organization-wide)</option>
                      {flatRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {'—\u00A0'.repeat(room.depth)}{room.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="df-unit" className="block text-sm font-medium text-dark-200 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      id="df-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g., $, %, hours, count"
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label htmlFor="df-interval" className="block text-sm font-medium text-dark-200 mb-1">
                      Entry Interval
                    </label>
                    <select
                      id="df-interval"
                      value={entryInterval}
                      onChange={(e) => setEntryInterval(e.target.value as EntryInterval)}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                    <p className="mt-1 text-xs text-dark-400">
                      How often this data should be entered
                    </p>
                  </div>

                  <div>
                    <label htmlFor="df-desc" className="block text-sm font-medium text-dark-200 mb-1">
                      Description
                    </label>
                    <textarea
                      id="df-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                      rows={2}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-dark-200 hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !name.trim()}
                      className="px-4 py-2 text-sm font-medium text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? 'Saving...' : editField ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
