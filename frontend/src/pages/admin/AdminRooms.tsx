import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderIcon,
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { useRoom } from '../../context/RoomContext'
import { useToast } from '../../context/ToastContext'
import { CreateRoomModal } from '../../components/CreateRoomModal'
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal'
import { RoomTreeNode } from '../../types/room'
import { roomsApi } from '../../services/rooms'

export function AdminRooms() {
  const { roomTree, isLoading, fetchRooms, fetchRoomTree } = useRoom()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteRoom, setDeleteRoom] = useState<RoomTreeNode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleRoomCreated = (roomId: string) => {
    setIsCreateModalOpen(false)
    fetchRooms()
    fetchRoomTree()
    navigate(`/rooms/${roomId}`)
  }

  const handleDeleteRoom = async () => {
    if (!deleteRoom) return
    setIsDeleting(true)
    try {
      await roomsApi.deleteRoom(deleteRoom.id)
      success('Room deleted', `"${deleteRoom.name}" has been removed`)
      setDeleteRoom(null)
      fetchRooms()
      fetchRoomTree()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      showError('Failed to delete room', error.response?.data?.detail || 'Please try again')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalRooms = countNodes(roomTree)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-300">
          {totalRooms} room{totalRooms !== 1 ? 's' : ''} in your organization
        </p>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Create Room
        </button>
      </div>

      {/* Room Tree */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-dark-300">Loading rooms...</div>
        ) : roomTree.length === 0 ? (
          <div className="p-8 text-center text-dark-300">
            <FolderIcon className="w-12 h-12 mx-auto mb-4 text-dark-500" />
            <p>No rooms yet. Create your first room to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {roomTree.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                level={0}
                onDelete={setDeleteRoom}
                onNavigate={(id) => navigate(`/rooms/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleRoomCreated}
      />

      {/* Delete Confirmation */}
      {deleteRoom && (
        <DeleteConfirmModal
          isOpen={!!deleteRoom}
          onClose={() => setDeleteRoom(null)}
          onConfirm={handleDeleteRoom}
          title="Delete Room"
          message={`Are you sure you want to delete "${deleteRoom.name}"? ${
            deleteRoom.children.length > 0
              ? `This will also delete ${deleteRoom.children.length} sub-room(s).`
              : ''
          } This action cannot be undone.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}

function RoomRow({
  room,
  level,
  onDelete,
  onNavigate,
}: {
  room: RoomTreeNode
  level: number
  onDelete: (room: RoomTreeNode) => void
  onNavigate: (id: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = room.children && room.children.length > 0

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-dark-800/50 transition-colors group"
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 text-dark-400 hover:text-foreground rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Room info */}
        <button
          onClick={() => onNavigate(room.id)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <FolderIcon className="h-5 w-5 text-dark-400 flex-shrink-0" />
          <span className="text-foreground font-medium truncate">{room.name}</span>
        </button>

        {/* Stats badges */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {room.kpi_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-dark-400">
              <ChartBarIcon className="h-3.5 w-3.5" />
              {room.kpi_count}
            </span>
          )}
          {hasChildren && (
            <span className="flex items-center gap-1 text-xs text-dark-400">
              <UsersIcon className="h-3.5 w-3.5" />
              {room.children.length} sub
            </span>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={() => onDelete(room)}
          className="p-1.5 text-dark-500 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Delete room"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <>
          {room.children.map((child) => (
            <RoomRow
              key={child.id}
              room={child}
              level={level + 1}
              onDelete={onDelete}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}
    </>
  )
}

function countNodes(nodes: RoomTreeNode[]): number {
  return nodes.reduce(
    (count, node) => count + 1 + countNodes(node.children || []),
    0
  )
}
