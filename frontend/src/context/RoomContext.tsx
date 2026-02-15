import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { roomsApi } from '../services/rooms'
import { Room, RoomTreeNode, CreateRoomData, UpdateRoomData } from '../types/room'
import { useAuth } from './AuthContext'

interface RoomContextType {
  rooms: Room[]
  roomTree: RoomTreeNode[]
  selectedRoom: Room | null
  isLoading: boolean
  error: string | null
  selectRoom: (room: Room | null) => void
  fetchRooms: () => Promise<void>
  fetchRoomTree: () => Promise<void>
  createRoom: (data: CreateRoomData) => Promise<Room>
  updateRoom: (roomId: string, data: UpdateRoomData) => Promise<Room>
  deleteRoom: (roomId: string) => Promise<void>
}

const RoomContext = createContext<RoomContextType | undefined>(undefined)

interface RoomProviderProps {
  children: ReactNode
}

export function RoomProvider({ children }: RoomProviderProps) {
  const { isAuthenticated } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTree, setRoomTree] = useState<RoomTreeNode[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await roomsApi.getRooms()
      setRooms(response.rooms)
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
      setError('Failed to load rooms')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const fetchRoomTree = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const response = await roomsApi.getRoomTree()
      setRoomTree(response.rooms)
    } catch (err) {
      console.error('Failed to fetch room tree:', err)
    }
  }, [isAuthenticated])

  const selectRoom = useCallback((room: Room | null) => {
    setSelectedRoom(room)
    // Persist selection to localStorage
    if (room) {
      localStorage.setItem('selectedRoomId', room.id)
    } else {
      localStorage.removeItem('selectedRoomId')
    }
  }, [])

  const createRoom = useCallback(async (data: CreateRoomData): Promise<Room> => {
    const newRoom = await roomsApi.createRoom(data)
    // Refresh room list and tree
    await Promise.all([fetchRooms(), fetchRoomTree()])
    return newRoom
  }, [fetchRooms, fetchRoomTree])

  const updateRoom = useCallback(async (roomId: string, data: UpdateRoomData): Promise<Room> => {
    const updatedRoom = await roomsApi.updateRoom(roomId, data)
    // Refresh room list and tree
    await Promise.all([fetchRooms(), fetchRoomTree()])
    // Update selected room if it was the one updated
    if (selectedRoom?.id === roomId) {
      setSelectedRoom(updatedRoom)
    }
    return updatedRoom
  }, [fetchRooms, fetchRoomTree, selectedRoom])

  const deleteRoom = useCallback(async (roomId: string): Promise<void> => {
    await roomsApi.deleteRoom(roomId)
    // Refresh room list and tree
    await Promise.all([fetchRooms(), fetchRoomTree()])
    // Clear selected room if it was deleted
    if (selectedRoom?.id === roomId) {
      setSelectedRoom(null)
      localStorage.removeItem('selectedRoomId')
    }
  }, [fetchRooms, fetchRoomTree, selectedRoom])

  // Fetch rooms on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([fetchRooms(), fetchRoomTree()])
    } else {
      setRooms([])
      setRoomTree([])
      setSelectedRoom(null)
    }
  }, [isAuthenticated, fetchRooms, fetchRoomTree])

  // Restore selected room from localStorage
  useEffect(() => {
    const savedRoomId = localStorage.getItem('selectedRoomId')
    if (savedRoomId && rooms.length > 0) {
      const savedRoom = rooms.find(r => r.id === savedRoomId)
      if (savedRoom) {
        setSelectedRoom(savedRoom)
      }
    }
  }, [rooms])

  return (
    <RoomContext.Provider
      value={{
        rooms,
        roomTree,
        selectedRoom,
        isLoading,
        error,
        selectRoom,
        fetchRooms,
        fetchRoomTree,
        createRoom,
        updateRoom,
        deleteRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  const context = useContext(RoomContext)
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider')
  }
  return context
}
