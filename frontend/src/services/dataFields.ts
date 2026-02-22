import api from './api'
import type {
  DataField,
  DataFieldListResponse,
  CreateDataFieldData,
  UpdateDataFieldData,
  CreateFieldEntriesRequest,
  CreateFieldEntriesResponse,
  CSVImportResponse,
  TodayFieldFormResponse,
} from '../types/dataField'

export const dataFieldsApi = {
  // CRUD operations
  getAll: (roomId?: string) => {
    const params = roomId ? `?room_id=${roomId}` : ''
    return api.get<DataFieldListResponse>(`/api/data-fields${params}`).then(r => r.data)
  },

  getById: (id: string) =>
    api.get<DataField>(`/api/data-fields/${id}`).then(r => r.data),

  create: (data: CreateDataFieldData) =>
    api.post<DataField>('/api/data-fields', data).then(r => r.data),

  update: (id: string, data: UpdateDataFieldData) =>
    api.put<DataField>(`/api/data-fields/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/data-fields/${id}`),

  getKPIs: (id: string) =>
    api.get(`/api/data-fields/${id}/kpis`).then(r => r.data),

  // Per-field entry operations
  submitFieldEntries: (data: CreateFieldEntriesRequest) =>
    api.post<CreateFieldEntriesResponse>('/api/entries/fields', data).then(r => r.data),

  getTodayFieldForm: (date?: string, interval?: string) => {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (interval) params.set('interval', interval)
    const qs = params.toString()
    return api.get<TodayFieldFormResponse>(`/api/entries/fields/today${qs ? `?${qs}` : ''}`).then(r => r.data)
  },

  importCSV: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<CSVImportResponse>('/api/entries/fields/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
