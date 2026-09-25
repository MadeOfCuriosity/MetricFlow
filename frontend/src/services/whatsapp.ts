import api from './api'

export interface PendingLink {
  phone_e164: string
  expires_at: string
  code?: string | null
  wa_link?: string | null
}

export interface MyWhatsApp {
  phone_e164: string | null
  verified: boolean
  opted_in: boolean
  pending: PendingLink | null
}

export interface WhatsAppStatus {
  /** Server has Cloud API credentials */
  configured: boolean
  org_enabled: boolean
  timezone: string | null
  business_number: string | null
  me: MyWhatsApp
}

export const whatsappApi = {
  getStatus: () => api.get<WhatsAppStatus>('/api/whatsapp/status').then((r) => r.data),
  updateOrg: (data: { enabled?: boolean; timezone?: string }) =>
    api.put<WhatsAppStatus>('/api/whatsapp/org', data).then((r) => r.data),
  startLink: (phone: string) => api.post<PendingLink>('/api/whatsapp/link', { phone }).then((r) => r.data),
  unlink: () => api.delete<MyWhatsApp>('/api/whatsapp/link').then((r) => r.data),
}

/** "+918848827741" -> "+91 88488 27741" (Indian numbers), otherwise unchanged */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const m = e164.match(/^\+91(\d{5})(\d{5})$/)
  return m ? `+91 ${m[1]} ${m[2]}` : e164
}
