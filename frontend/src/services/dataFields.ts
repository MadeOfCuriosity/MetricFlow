import api from './api'
import type {
  DataField,
  DataFieldListResponse,
  CreateDataFieldData,
  UpdateDataFieldData,
  CreateFieldEntriesRequest,
  CreateFieldEntriesResponse,
  CSVImportResponse,
  CSVAnalysisResponse,
  CSVColumnMappingConfig,
  TodayFieldFormResponse,
  SheetViewResponse,
  PendingEntriesResponse,
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
    api.delete(`/api/data-fields/${id}`).then(r => r.data),

  // Per-field entry operations
  submitFieldEntries: (data: CreateFieldEntriesRequest) =>
    api.post<CreateFieldEntriesResponse>('/api/entries/fields', data).then(r => r.data),

  createEntries: (data: CreateFieldEntriesRequest) =>
    api.post<CreateFieldEntriesResponse>('/api/entries/fields', data).then(r => r.data),

  getTodayFieldForm: (date?: string, interval?: string) => {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (interval) params.set('interval', interval)
    const qs = params.toString()
    return api.get<TodayFieldFormResponse>(`/api/entries/fields/today${qs ? `?${qs}` : ''}`).then(r => r.data)
  },

  getTodayForm: (roomId?: string, interval?: string) => {
    const params = new URLSearchParams()
    if (roomId) params.set('room_id', roomId)
    if (interval) params.set('interval', interval)
    const qs = params.toString()
    return api.get<TodayFieldFormResponse>(`/api/entries/fields/today${qs ? `?${qs}` : ''}`).then(r => r.data)
  },

  /** Missed entries over the last `days` (newest first) */
  getPending: (days = 30) =>
    api.get<PendingEntriesResponse>(`/api/entries/fields/pending?days=${days}`).then((r) => r.data),

  getSheetData: (month: string, roomId?: string) => {
    const params = new URLSearchParams({ month })
    if (roomId) params.set('room_id', roomId)
    return api.get<SheetViewResponse>(`/api/entries/fields/sheet?${params}`).then(r => r.data)
  },


  analyzeCSV: (file: File, sheetName?: string, headerRowIndex?: number) => {
    const formData = new FormData()
    formData.append('file', file)
    if (sheetName) {
      formData.append('sheet_name', sheetName)
    }
    if (headerRowIndex !== undefined) {
      formData.append('header_row_index', String(headerRowIndex))
    }
    return api.post<CSVAnalysisResponse>('/api/entries/fields/analyze-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  importCSV: (file: File, mappingConfig?: CSVColumnMappingConfig) => {
    const formData = new FormData()
    formData.append('file', file)
    if (mappingConfig) {
      formData.append('mapping_config', JSON.stringify(mappingConfig))
    }
    return api.post<CSVImportResponse>('/api/entries/fields/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },


  downloadTemplate: async (month?: string) => {
    const params = month ? `?month=${month}` : ''
    const response = await api.get(`/api/entries/fields/csv-template${params}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const disposition = response.headers['content-disposition']
    const filename = disposition?.match(/filename="(.+)"/)?.[1] || 'template.csv'
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
