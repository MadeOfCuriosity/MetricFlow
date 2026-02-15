import api from './api'

export interface CompletionRateEntry {
  date: string
  rate: number
}

export interface AdminStats {
  total_users: number
  total_kpis: number
  total_rooms: number
  active_integrations: number
  total_data_entries: number
  today_data_entries: number
  completion_rate: CompletionRateEntry[]
}

export interface ActivityEntry {
  id: string
  type:
    | 'data_entry'
    | 'user_joined'
    | 'kpi_created'
    | 'room_created'
    | 'integration_synced'
  description: string
  user_name: string | null
  timestamp: string
  metadata: Record<string, unknown>
}

export interface ActivityFeedResponse {
  activities: ActivityEntry[]
  total: number
}

export const adminService = {
  getStats: (days = 30) =>
    api.get<AdminStats>(`/api/admin/stats?days=${days}`).then((r) => r.data),

  getActivity: (limit = 50, offset = 0) =>
    api
      .get<ActivityFeedResponse>(
        `/api/admin/activity?limit=${limit}&offset=${offset}`
      )
      .then((r) => r.data),
}
