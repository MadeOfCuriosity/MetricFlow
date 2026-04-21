import api from './api'

export interface ActiveNotification {
  id: string
  title: string
  body: string
  cta_label: string | null
  cta_url: string | null
  severity: string
  sent_at: string | null
}

export const notificationsService = {
  async getActive(): Promise<ActiveNotification[]> {
    const res = await api.get<ActiveNotification[]>('/api/notifications/active')
    return res.data
  },

  async dismiss(id: string): Promise<void> {
    await api.post(`/api/notifications/${id}/dismiss`)
  },
}
