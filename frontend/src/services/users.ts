import api from './api'
import { UserRole } from './auth'

export interface RoomBasic {
  id: string
  name: string
}

export interface UserWithRooms {
  id: string
  email: string
  name: string
  role: UserRole
  role_label: string
  created_at: string
  assigned_rooms: RoomBasic[]
}

export interface UserListResponse {
  users: UserWithRooms[]
  total: number
}

export interface InviteUserData {
  email: string
  name: string
  role: UserRole
  role_label: string
  room_ids?: string[]
}

export interface InviteUserResponse {
  user: UserWithRooms
  temporary_password: string
  message: string
}

export interface UpdateUserRoomsData {
  room_ids: string[]
}

export interface UpdateUserRoleData {
  role: UserRole
  room_ids?: string[]
}

export const usersService = {
  async getUsers(): Promise<UserListResponse> {
    const response = await api.get<UserListResponse>('/api/users')
    return response.data
  },

  async getUser(userId: string): Promise<UserWithRooms> {
    const response = await api.get<UserWithRooms>(`/api/users/${userId}`)
    return response.data
  },

  async inviteUser(data: InviteUserData): Promise<InviteUserResponse> {
    const response = await api.post<InviteUserResponse>('/api/auth/invite-user', data)
    return response.data
  },

  async updateUserRooms(userId: string, data: UpdateUserRoomsData): Promise<UserWithRooms> {
    const response = await api.put<UserWithRooms>(`/api/users/${userId}/rooms`, data)
    return response.data
  },

  async updateUserRole(userId: string, data: UpdateUserRoleData): Promise<UserWithRooms> {
    const response = await api.put<UserWithRooms>(`/api/users/${userId}/role`, data)
    return response.data
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/api/users/${userId}`)
  },

  async resetPassword(userId: string): Promise<{ temporary_password: string; message: string }> {
    const response = await api.post<{ temporary_password: string; message: string }>(`/api/users/${userId}/reset-password`)
    return response.data
  },
}
