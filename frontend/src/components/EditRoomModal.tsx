import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { Room } from '../types/room'
import { MAC_TAG_COLORS } from '../constants/tagColors'
import { GlassmorphicFolder } from './GlassmorphicFolder'

interface EditRoomModalProps {
  isOpen: boolean
  onClose: () => void
  room: {
    id: string
    name: string
    description?: string | null
    color?: string | null
  }
  onUpdated: (updatedRoom: Room) => void
}

export function EditRoomModal({ isOpen, onClose, room, onUpdated }: EditRoomModalProps) {
  const { updateRoom } = useRoom()
  const [name, setName] = useState(room.name)
  const [description, setDescription] = useState(room.description || '')
  const [selectedColor, setSelectedColor] = useState<string | null>(room.color || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(room.name)
    setDescription(room.description || '')
    setSelectedColor(room.color || null)
    setError(null)
  }, [room, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const updated = await updateRoom(room.id, {
        name: name.trim(),
        description: description.trim() || null,
        color: selectedColor || null,
      })
      onUpdated(updated)
      onClose()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Failed to update room')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                    Edit Room
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-dark-300 hover:text-foreground transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Live Glassmorphic Folder Preview with Color */}
                <div className="flex flex-col items-center justify-center py-3 px-4 mb-4 rounded-xl bg-dark-900/60 border border-dark-700/60">
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
                    <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-dark-200 mb-1">
                      Room Name *
                    </label>
                    <input
                      type="text"
                      id="edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      minLength={2}
                      maxLength={255}
                    />
                  </div>

                  {/* macOS Tag Color & Custom Color Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-dark-200">
                        Tag Color <span className="text-xs text-dark-400 font-normal">(macOS style)</span>
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

                    <div className="flex items-center justify-between px-3 py-2.5 bg-dark-700/70 border border-dark-600 rounded-lg">
                      {/* Clear / None button */}
                      <button
                        type="button"
                        onClick={() => setSelectedColor(null)}
                        title="None"
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                          !selectedColor
                            ? 'border-white/90 bg-dark-600 text-white scale-110 shadow-xs'
                            : 'border-dark-500 bg-dark-800 text-dark-400 hover:border-dark-400 hover:text-dark-200'
                        }`}
                      >
                        <span className="text-[10px] leading-none">✕</span>
                      </button>

                      <div className="h-4 w-px bg-dark-600 mx-1" />

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
                                ? 'ring-2 ring-offset-2 ring-offset-dark-800 ring-white scale-115'
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

                      <div className="h-4 w-px bg-dark-600 mx-1" />

                      {/* Simple Native Color Picker */}
                      {(() => {
                        const isCustom = !!(selectedColor && selectedColor.startsWith('#'))
                        return (
                          <label
                            title={isCustom ? `Custom: ${selectedColor}` : 'Custom color picker'}
                            className={`relative w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center overflow-hidden border ${
                              isCustom
                                ? 'ring-2 ring-offset-2 ring-offset-dark-800 ring-white scale-115 border-white shadow-md'
                                : 'border-dark-500 hover:border-dark-300 hover:scale-110 opacity-90 hover:opacity-100'
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
                    <label htmlFor="edit-description" className="block text-sm font-medium text-dark-200 mb-1">
                      Description
                    </label>
                    <textarea
                      id="edit-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description for this room"
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-dark-200 hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !name.trim()}
                      className="px-4 py-2 text-sm font-medium text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
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
