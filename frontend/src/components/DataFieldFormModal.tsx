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
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [entryInterval, setEntryInterval] = useState<EntryInterval>('daily')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const flatRooms = useMemo(() => flattenTree(roomTree), [roomTree])

  useEffect(() => {
    if (editField) {
      setName(editField.name)
      setDescription(editField.description || '')
      setUnit(editField.unit || '')
      setSelectedRoomIds(editField.room_ids || [])
      setEntryInterval(editField.entry_interval || 'daily')
    } else {
      setName('')
      setDescription('')
      setUnit('')
      setSelectedRoomIds([])
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
          room_ids: selectedRoomIds,
          entry_interval: entryInterval,
        })
        onCreated(updated)
      } else {
        const data: CreateDataFieldData = {
          name: name.trim(),
          description: description.trim() || undefined,
          unit: unit.trim() || undefined,
          room_ids: selectedRoomIds.length > 0 ? selectedRoomIds : undefined,
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
    setSelectedRoomIds([])
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 p-6 shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-base font-bold text-foreground tracking-tight">
                    {editField ? 'Edit Data Field' : 'Create Data Field'}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-dark-400 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="df-name" className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="df-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Revenue, Deals Closed, Marketing Spend"
                      className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                      required
                      minLength={1}
                      maxLength={255}
                    />
                    {name.trim() && (
                      <p className="mt-1 text-xs text-dark-400">
                        Variable name: <code className="text-primary-400 font-mono text-[11px] bg-dark-950 px-1.5 py-0.5 rounded border border-dark-800">{variablePreview}</code>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Rooms
                    </label>
                    {flatRooms.length === 0 ? (
                      <p className="text-xs text-dark-400 py-2">No rooms created yet. Field will be organization-wide.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto bg-dark-950/40 border border-dark-800 rounded-xl p-2 space-y-1">
                        {flatRooms.map((room) => (
                          <label
                            key={room.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-800/40 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRoomIds.includes(room.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRoomIds([...selectedRoomIds, room.id])
                                } else {
                                  setSelectedRoomIds(selectedRoomIds.filter((id) => id !== room.id))
                                }
                              }}
                              className="rounded border-dark-700 bg-dark-900 text-primary-500 focus:ring-primary-500 w-3.5 h-3.5"
                            />
                            <span className="text-foreground font-medium">
                              {'—\u00A0'.repeat(room.depth)}{room.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-dark-400">
                      {selectedRoomIds.length === 0 ? 'Organization-wide (no rooms selected)' : `${selectedRoomIds.length} room${selectedRoomIds.length !== 1 ? 's' : ''} selected`}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="df-unit" className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Unit
                    </label>
                    <input
                      type="text"
                      id="df-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g., $, %, hours, count"
                      className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label htmlFor="df-interval" className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Entry Interval
                    </label>
                    <select
                      id="df-interval"
                      value={entryInterval}
                      onChange={(e) => setEntryInterval(e.target.value as EntryInterval)}
                      className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                    <p className="mt-1 text-[11px] text-dark-400">
                      How often this data should be entered
                    </p>
                  </div>

                  <div>
                    <label htmlFor="df-desc" className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="df-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-800">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-foreground transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !name.trim()}
                      className="px-4 py-2.5 text-xs font-semibold text-dark-950 bg-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : editField ? 'Update Field' : 'Create Field'}
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
