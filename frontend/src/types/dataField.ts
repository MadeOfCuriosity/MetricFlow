export interface DataField {
  id: string
  org_id: string
  room_id: string | null
  room_name: string | null
  room_path: string | null
  name: string
  variable_name: string
  description: string | null
  unit: string | null
  created_by: string | null
  created_at: string
  kpi_count: number
  latest_value: number | null
  latest_date: string | null
}

export interface DataFieldListResponse {
  data_fields: DataField[]
  total: number
}

export interface DataFieldBrief {
  id: string
  name: string
  variable_name: string
  room_id: string | null
  room_name: string | null
}

export interface CreateDataFieldData {
  name: string
  room_id?: string
  description?: string
  unit?: string
}

export interface UpdateDataFieldData {
  name?: string
  description?: string
  unit?: string
  room_id?: string
}

// Per-field entry types
export interface FieldEntryInput {
  data_field_id: string
  value: number
}

export interface CreateFieldEntriesRequest {
  date: string
  entries: FieldEntryInput[]
}

export interface FieldEntryResponse {
  id: string
  data_field_id: string
  data_field_name: string | null
  room_name: string | null
  date: string
  value: number
  entered_by: string | null
  created_at: string
}

export interface CreateFieldEntriesResponse {
  message: string
  entries_created: number
  entries: FieldEntryResponse[]
  kpis_recalculated: number
  errors: { data_field_id: string; error: string }[]
}

// Today's form types
export interface FieldFormItem {
  data_field_id: string
  data_field_name: string
  variable_name: string
  unit: string | null
  has_entry_today: boolean
  today_value: number | null
}

export interface RoomFieldGroup {
  room_id: string | null
  room_name: string
  fields: FieldFormItem[]
}

export interface TodayFieldFormResponse {
  date: string
  rooms: RoomFieldGroup[]
  completed_count: number
  total_count: number
}
