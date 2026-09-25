export type EntryInterval = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface DataField {
  id: string
  org_id: string
  room_ids: string[]
  room_names: string[]
  room_paths: string[]
  /** Rooms inherited because a KPI in that room uses this field (read-only) */
  kpi_room_ids?: string[]
  kpi_room_paths?: string[]
  name: string
  variable_name: string
  description: string | null
  unit: string | null
  entry_interval: EntryInterval
  /** First day of the first weekly/monthly period (yyyy-MM-dd); null for daily/custom */
  period_start_date?: string | null
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
  room_ids: string[]
  room_names: string[]
}

export interface CreateDataFieldData {
  name: string
  room_ids?: string[]
  description?: string
  unit?: string
  entry_interval?: EntryInterval
  period_start_date?: string
}

export interface UpdateDataFieldData {
  name?: string
  description?: string
  unit?: string
  room_ids?: string[]
  entry_interval?: EntryInterval
  period_start_date?: string
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
  room_names: string[]
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
  entry_interval: EntryInterval
  has_entry_today: boolean
  today_value: number | null
  /** The period this value belongs to (same day for daily/custom) */
  period_start?: string | null
  period_end?: string | null
  /** Who saved the current value */
  entered_by_name?: string | null
}

export interface RoomAssignee {
  id: string
  name: string
}

export interface RoomFieldGroup {
  room_id: string | null
  room_name: string
  room_color?: string | null
  /** Users assigned to the room — responsible for completing its entries */
  assignees?: RoomAssignee[]
  fields: FieldFormItem[]
}

export interface TodayFieldFormResponse {
  date: string
  interval: EntryInterval | null
  rooms: RoomFieldGroup[]
  completed_count: number
  total_count: number
}

// Sheet View
export interface SheetFieldRow {
  data_field_id: string
  name: string
  variable_name: string
  unit: string | null
  entry_interval: EntryInterval
  values: Record<string, number | null>
  mtd: number
  /** Weekly/monthly: editable cells only — period start -> period end. null = every day */
  periods?: Record<string, string> | null
  /** First day of the first weekly/monthly period */
  period_start_date?: string | null
}

export interface SheetRoomGroup {
  room_id: string | null
  room_name: string
  fields: SheetFieldRow[]
}

export interface SheetViewResponse {
  month: string
  dates: string[]
  room_groups: SheetRoomGroup[]
  total_filled: number
  total_cells: number
}

// CSV & Excel Import & Analysis
export type CSVLayoutType = 'matrix' | 'columnar' | 'long' | 'transactional' | 'statement'

export interface CSVFieldMapping {
  source_column: string
  target_field_id?: string | null
  target_field_name?: string | null
  action: 'auto' | 'map' | 'create' | 'ignore'
}

export interface CSVColumnMappingConfig {
  layout: CSVLayoutType
  date_column?: string | null
  room_column?: string | null
  field_column?: string | null
  value_column?: string | null
  date_format?: string | null
  statement_date?: string | null
  sheet_name?: string | null
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'latest'
  field_mappings?: CSVFieldMapping[]
  header_row_index?: number | null
}

export interface CSVAnalysisResponse {
  detected_layout: CSVLayoutType
  delimiter: string
  total_rows: number
  headers: string[]
  preview_rows: string[][]
  suggested_date_column: string | null
  suggested_room_column: string | null
  suggested_statement_date?: string | null
  suggested_field_mappings: CSVFieldMapping[]
  unmatched_columns: string[]
  sheets?: string[]
  selected_sheet?: string | null
  header_row_index: number
  rows_before_header: string[][]
}

export interface CSVImportResponse {
  rows_processed: number
  entries_created: number
  fields_created: string[]
  kpis_recalculated: number
  errors: { row: number; error: string }[]
  unmatched_columns: string[]
}



// Missed entries of scheduled fields (save with date = period_start)
export interface PendingFieldItem {
  data_field_id: string
  data_field_name: string
  unit: string | null
  entry_interval: EntryInterval
  period_start: string
  period_end: string
  room_names: string[]
}

export interface PendingEntriesResponse {
  since: string
  items: PendingFieldItem[]
  total: number
}
