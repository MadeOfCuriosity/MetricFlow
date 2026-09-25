export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'other'

/** Mirrors backend `KPIResponse` (app/schemas/kpi.py). */
export interface KPI {
  id: string
  org_id: string
  name: string
  description: string | null
  formula: string
  input_fields: string[]
  category: string
  time_period: TimePeriod
  is_preset: boolean
  is_shared: boolean
  created_by: string | null
  created_at: string

  // Enrichment — filled by GET /api/kpis, empty/absent on other endpoints
  room_paths?: string[]
  assigned_room_ids?: string[]
  room_id?: string | null
  room_name?: string | null
  room_color?: string | null
  latest_value?: number | null
  last_updated_at?: string | null
  previous_value?: number | null

  // Not returned by the API today; UI code still reads them defensively
  unit?: string
  direction?: 'up' | 'down'
  is_active?: boolean
}
