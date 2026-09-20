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

export interface ActivityHeatmapDay {
  date: string
  count: number
  level: number // 0 to 4
}

export interface ActivityHeatmapResponse {
  days: ActivityHeatmapDay[]
  total_activities: number
  current_streak: number
  longest_streak: number
  start_date: string
  end_date: string
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

  getActivityHeatmap: (days = 365, year?: number) => {
    const params = new URLSearchParams()
    if (days) params.append('days', days.toString())
    if (year) params.append('year', year.toString())
    return api
      .get<ActivityHeatmapResponse>(`/api/admin/activity-heatmap?${params.toString()}`)
      .then((r) => r.data)
  },
}
