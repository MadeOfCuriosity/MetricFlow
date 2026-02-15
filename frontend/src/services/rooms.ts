import api from './api'
import {
  Room,
  RoomListResponse,
  RoomTreeResponse,
  RoomDashboardResponse,
  CreateRoomData,
  UpdateRoomData,
  AssignKPIsData,
  AssignKPIsResponse,
} from '../types/room'

export const roomsApi = {
  // Get all rooms (flat list)
  getRooms: async (): Promise<RoomListResponse> => {
    const response = await api.get('/api/rooms')
    return response.data
  },

  // Get rooms as tree structure for sidebar
  getRoomTree: async (): Promise<RoomTreeResponse> => {
    const response = await api.get('/api/rooms/tree')
    return response.data
  },

  // Create a new room
  createRoom: async (data: CreateRoomData): Promise<Room> => {
    const response = await api.post('/api/rooms', data)
    return response.data
  },

  // Get single room by ID
  getRoom: async (roomId: string): Promise<Room> => {
    const response = await api.get(`/api/rooms/${roomId}`)
    return response.data
  },

  // Update a room
  updateRoom: async (roomId: string, data: UpdateRoomData): Promise<Room> => {
    const response = await api.put(`/api/rooms/${roomId}`, data)
    return response.data
  },

  // Delete a room
  deleteRoom: async (roomId: string): Promise<void> => {
    await api.delete(`/api/rooms/${roomId}`)
  },

  // Assign KPIs to a room
  assignKPIs: async (roomId: string, data: AssignKPIsData): Promise<AssignKPIsResponse> => {
    const response = await api.post(`/api/rooms/${roomId}/kpis`, data)
    return response.data
  },

  // Remove KPI from room
  removeKPI: async (roomId: string, kpiId: string): Promise<void> => {
    await api.delete(`/api/rooms/${roomId}/kpis/${kpiId}`)
  },

  // Get room dashboard data
  getRoomDashboard: async (roomId: string): Promise<RoomDashboardResponse> => {
    const response = await api.get(`/api/rooms/${roomId}/dashboard`)
    return response.data
  },
}

export default roomsApi
