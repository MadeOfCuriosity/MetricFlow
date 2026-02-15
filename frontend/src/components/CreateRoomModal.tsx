import { useState, useMemo, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { RoomTreeNode } from '../types/room'

interface FlatRoomOption {
  id: string
  name: string
  depth: number
}

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (roomId: string) => void
  parentRoomId?: string
}

/** Flatten a room tree into a list with depth info for the parent dropdown. */
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

export function CreateRoomModal({ isOpen, onClose, onCreated, parentRoomId }: CreateRoomModalProps) {
  const { roomTree, createRoom } = useRoom()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedParentId, setSelectedParentId] = useState(parentRoomId || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Flatten room tree for parent dropdown with hierarchy indication
  const flatRooms = useMemo(() => flattenTree(roomTree), [roomTree])
  const isCreatingSubRoom = !!selectedParentId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const newRoom = await createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
        parent_room_id: selectedParentId || undefined,
      })
      // Reset form
      setName('')
      setDescription('')
      setSelectedParentId('')
      onCreated(newRoom.id)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Failed to create room')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setSelectedParentId(parentRoomId || '')
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
                    {isCreatingSubRoom ? 'Create New Sub-room' : 'Create New Room'}
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
                    <label htmlFor="name" className="block text-sm font-medium text-dark-200 mb-1">
                      {isCreatingSubRoom ? 'Sub-room Name *' : 'Room Name *'}
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isCreatingSubRoom ? "e.g., North Region, Team A" : "e.g., Sales, Marketing, Operations"}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      minLength={2}
                      maxLength={255}
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-dark-200 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description for this room"
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="parent" className="block text-sm font-medium text-dark-200 mb-1">
                      Parent Room
                    </label>
                    <select
                      id="parent"
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">No parent (top-level room)</option>
                      {flatRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {'—\u00A0'.repeat(room.depth)}{room.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-dark-400">
                      Select a parent room to create a sub-room. Rooms can be nested to any depth.
                    </p>
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
                      {isSubmitting ? 'Creating...' : isCreatingSubRoom ? 'Create Sub-room' : 'Create Room'}
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
