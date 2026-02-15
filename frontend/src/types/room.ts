export interface Room {
  id: string
  org_id: string
  name: string
  description: string | null
  parent_room_id: string | null
  created_by: string | null
  created_at: string
  kpi_count: number
  sub_room_count: number
}

export interface RoomTreeNode {
  id: string
  name: string
  description: string | null
  children: RoomTreeNode[]
  kpi_count: number
}

export interface RoomListResponse {
  rooms: Room[]
  total: number
}

export interface RoomTreeResponse {
  rooms: RoomTreeNode[]
}

export interface CreateRoomData {
  name: string
  description?: string
  parent_room_id?: string
}

export interface UpdateRoomData {
  name?: string
  description?: string
}

export interface AssignKPIsData {
  kpi_ids: string[]
}

export interface AssignKPIsResponse {
  message: string
  assigned_count: number
}

export interface RoomBreadcrumb {
  id: string
  name: string
}

export interface KPI {
  id: string
  org_id: string
  name: string
  description: string | null
  formula: string
  input_fields: string[]
  category: string
  time_period: string
  is_preset: boolean
  is_shared: boolean
  created_by: string | null
  created_at: string
}

export interface RoomDashboardResponse {
  room: Room
  breadcrumbs: RoomBreadcrumb[]
  room_kpis: KPI[]
  sub_room_kpis: KPI[]
  shared_kpis: KPI[]
}
