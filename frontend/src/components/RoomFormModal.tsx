import { useState, useEffect, useMemo } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { Room, RoomTreeNode } from '../types/room'
import { TagColorPalette } from './TagColorPalette'
import { GlassmorphicFolder } from './GlassmorphicFolder'
import { getApiError } from '../lib/apiError'
import { Modal } from './ui/Modal'

interface FlatRoomOption {
  id: string
  name: string
  depth: number
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

type RoomFormModalProps =
  | {
      mode: 'create'
      isOpen: boolean
      onClose: () => void
      onCreated: (roomId: string) => void
      /** Pre-selects the parent (creates a sub-room) */
      parentRoomId?: string
    }
  | {
      mode: 'edit'
      isOpen: boolean
      onClose: () => void
      room: { id: string; name: string; description?: string | null; color?: string | null }
      onUpdated: (updatedRoom: Room) => void
    }

const inputClass =
  'w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors'
const labelClass = 'block text-xs font-semibold text-dark-300 mb-1.5'

/** Create a room / sub-room, or edit an existing room's name, tag color and description. */
export function RoomFormModal(props: RoomFormModalProps) {
  const { isOpen, onClose, mode } = props
  const isEdit = mode === 'edit'
  const editRoom = isEdit ? props.room : null
  const initialParentId = !isEdit ? props.parentRoomId || '' : ''

  const { roomTree, createRoom, updateRoom } = useRoom()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedParentId, setSelectedParentId] = useState(initialParentId)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // (Re)initialise the form every time it opens, so it always reflects the current room / parent
  useEffect(() => {
    if (!isOpen) return
    setName(editRoom?.name ?? '')
    setDescription(editRoom?.description || '')
    setSelectedColor(editRoom?.color || null)
    setSelectedParentId(initialParentId)
    setError(null)
  }, [isOpen, editRoom?.id, initialParentId])

  const flatRooms = useMemo(() => flattenTree(roomTree), [roomTree])
  const isCreatingSubRoom = !isEdit && !!selectedParentId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (props.mode === 'edit') {
        const updated = await updateRoom(props.room.id, {
          name: name.trim(),
          description: description.trim() || null,
          color: selectedColor || null,
        })
        props.onUpdated(updated)
        onClose()
      } else {
        const newRoom = await createRoom({
          name: name.trim(),
          description: description.trim() || undefined,
          parent_room_id: selectedParentId || undefined,
          color: selectedColor || undefined,
        })
        props.onCreated(newRoom.id)
      }
    } catch (err: unknown) {
      setError(getApiError(err, isEdit ? 'Failed to update room' : 'Failed to create room'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = isEdit ? 'Edit Room' : isCreatingSubRoom ? 'Create New Sub-room' : 'Create New Room'
  const submitLabel = isSubmitting
    ? isEdit
      ? 'Saving...'
      : 'Creating...'
    : isEdit
      ? 'Save Changes'
      : isCreatingSubRoom
        ? 'Create Sub-room'
        : 'Create Room'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-md transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 p-6 shadow-2xl transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <Dialog.Title className="text-base font-bold text-foreground tracking-tight">{title}</Dialog.Title>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-800 transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Live Glassmorphic Folder Preview */}
      <div className="flex flex-col items-center justify-center py-3 px-4 mb-4 rounded-2xl bg-dark-950/40 border border-dark-800">
        <GlassmorphicFolder color={selectedColor} className="w-26 h-24" isHovered={true} />
        <span className="text-[11px] text-dark-400 mt-1 font-medium capitalize">
          {selectedColor ? `${selectedColor} tag folder` : 'Default obsidian folder'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="room-name" className={labelClass}>
            {isCreatingSubRoom ? 'Sub-room Name *' : 'Room Name *'}
          </label>
          <input
            type="text"
            id="room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isCreatingSubRoom ? 'e.g., North Region, Team A' : 'e.g., Sales, Marketing, Operations'}
            className={inputClass}
            required
            minLength={2}
            maxLength={255}
          />
        </div>

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
          <div className="px-3 py-2.5 bg-dark-800/90 border border-dark-700 rounded-xl">
            <TagColorPalette value={selectedColor} onChange={setSelectedColor} />
          </div>
        </div>

        <div>
          <label htmlFor="room-description" className={labelClass}>
            Description
          </label>
          <textarea
            id="room-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this room"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {!isEdit && (
          <div>
            <label htmlFor="room-parent" className={labelClass}>
              Parent Room
            </label>
            <select
              id="room-parent"
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">No parent (top-level room)</option>
              {flatRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {'— '.repeat(room.depth)}
                  {room.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-dark-400">
              Select a parent room to create a sub-room. Rooms can be nested to any depth.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-primary-500 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm cursor-pointer"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
