import api from './api'
import type {
  DataSourceOptionsResponse,
  RecipientListResponse,
  Recipient,
  RecipientsCsvImportResponse,
  SuppressionListResponse,
  Suppression,
  SendLogListResponse,
} from '../types/whatsappNotifier'

const BASE = '/api/apps/whatsapp_notifier'

export const whatsappNotifierApi = {
  listDataSources: () =>
    api.get<DataSourceOptionsResponse>(`${BASE}/data-sources`).then((r) => r.data),

  listRecipients: () =>
    api.get<RecipientListResponse>(`${BASE}/recipients`).then((r) => r.data),

  upsertRecipient: (data: { name: string; phone: string; notes?: string }) =>
    api.post<Recipient>(`${BASE}/recipients`, data).then((r) => r.data),

  removeRecipient: (id: string) => api.delete(`${BASE}/recipients/${id}`),

  importCsv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<RecipientsCsvImportResponse>(`${BASE}/recipients/import-csv`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  listSuppressions: () =>
    api.get<SuppressionListResponse>(`${BASE}/suppressions`).then((r) => r.data),

  addSuppression: (phone: string, reason?: string) =>
    api.post<Suppression>(`${BASE}/suppressions`, { phone, reason }).then((r) => r.data),

  removeSuppression: (phone: string) =>
    api.delete(`${BASE}/suppressions/${encodeURIComponent(phone)}`),

  listSendLogs: (limit = 50) =>
    api.get<SendLogListResponse>(`${BASE}/send-logs`, { params: { limit } }).then((r) => r.data),
}
