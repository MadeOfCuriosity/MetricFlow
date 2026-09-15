import { useState, useMemo, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { RoomTreeNode } from '../types/room'
import { MAC_TAG_COLORS } from '../constants/tagColors'
import { GlassmorphicFolder } from './GlassmorphicFolder'

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
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
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
        color: selectedColor || undefined,
      })
      // Reset form
      setName('')
      setDescription('')
      setSelectedParentId('')
      setSelectedColor(null)
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
    setSelectedColor(null)
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
                    {isCreatingSubRoom ? 'Create New Sub-room' : 'Create New Room'}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-dark-300 hover:text-foreground transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Live Glassmorphic Folder Preview */}
                <div className="flex flex-col items-center justify-center py-3 px-4 mb-4 rounded-2xl bg-dark-950/40 border border-dark-800">
                  <GlassmorphicFolder
                    color={selectedColor}
                    className="w-26 h-24"
                    isHovered={true}
                  />
                  <span className="text-[11px] text-dark-400 mt-1 font-medium capitalize">
                    {selectedColor ? `${selectedColor} tag folder` : 'Default obsidian folder'}
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-dark-300 mb-1.5">
                      {isCreatingSubRoom ? 'Sub-room Name *' : 'Room Name *'}
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isCreatingSubRoom ? "e.g., North Region, Team A" : "e.g., Sales, Marketing, Operations"}
                      className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                      required
                      minLength={2}
                      maxLength={255}
                    />
                  </div>

                  {/* macOS Tag Color & Custom Color Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-dark-300">
                        Tag Color <span className="text-xs text-dark-400 font-normal">(optional)</span>
                      </label>
                      {selectedColor && (
                        <button
                          type="button"
                          onClick={() => setSelectedColor(null)}
                          className="text-xs text-dark-400 hover:text-dark-200 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-3 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl">
                      {/* Clear / None button */}
                      <button
                        type="button"
                        onClick={() => setSelectedColor(null)}
                        title="None"
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                          !selectedColor
                            ? 'border-foreground/90 bg-dark-700 text-foreground scale-110 shadow-xs'
                            : 'border-dark-700 bg-dark-900 text-dark-400 hover:border-dark-500 hover:text-dark-200'
                        }`}
                      >
                        <span className="text-[10px] leading-none">✕</span>
                      </button>

                      <div className="h-4 w-px bg-dark-700 mx-1" />

                      {/* 7 macOS Colors */}
                      {MAC_TAG_COLORS.map((tag) => {
                        const isSelected = selectedColor === tag.id
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => setSelectedColor(isSelected ? null : tag.id)}
                            title={tag.name}
                            className={`relative w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                              isSelected
                                ? 'ring-2 ring-offset-2 ring-offset-dark-900 ring-foreground scale-115'
                                : 'hover:scale-110 opacity-85 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: tag.hex,
                              boxShadow: isSelected ? `0 0 10px ${tag.ambientGlow}` : undefined,
                            }}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                            )}
                          </button>
                        )
                      })}

                      <div className="h-4 w-px bg-dark-700 mx-1" />

                      {/* Simple Native Color Picker */}
                      {(() => {
                        const isCustom = !!(selectedColor && selectedColor.startsWith('#'))
                        return (
                          <label
                            title={isCustom ? `Custom: ${selectedColor}` : 'Custom color picker'}
                            className={`relative w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center overflow-hidden border ${
                              isCustom
                                ? 'ring-2 ring-offset-2 ring-offset-dark-900 ring-foreground scale-115 border-foreground shadow-md'
                                : 'border-dark-700 hover:border-dark-500 hover:scale-110 opacity-90 hover:opacity-100'
                            }`}
                            style={
                              isCustom
                                ? { backgroundColor: selectedColor || undefined }
                                : {
                                    background:
                                      'conic-gradient(from 180deg at 50% 50%, #f87171 0deg, #facc15 72deg, #4ade80 144deg, #60a5fa 216deg, #c084fc 288deg, #f87171 360deg)',
                                  }
                            }
                          >
                            <input
                              type="color"
                              value={selectedColor && selectedColor.startsWith('#') ? selectedColor : '#60a5fa'}
                              onChange={(e) => setSelectedColor(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            {isCustom ? (
                              <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-md" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-dark-950/40 pointer-events-none" />
                            )}
                          </label>
                        )
                      })()}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description for this room"
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="parent" className="block text-xs font-semibold text-dark-300 mb-1.5">
                      Parent Room
                    </label>
                    <select
                      id="parent"
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
                    >
                      <option value="">No parent (top-level room)</option>
                      {flatRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {'—\u00A0'.repeat(room.depth)}{room.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-dark-400">
                      Select a parent room to create a sub-room. Rooms can be nested to any depth.
                    </p>
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
