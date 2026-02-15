export type WidgetType =
  | 'stat-number'
  | 'line-chart'
  | 'bar-chart'
  | 'area-chart'
  | 'gauge-progress'
  | 'insights-list'
  | 'kpi-cards'
  | 'today-progress'

export type WidgetDateRange = 'weekly' | 'monthly' | 'quarterly' | 'all'

export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  kpiId?: string
  dateRange?: WidgetDateRange
  showTrend?: boolean
  maxItems?: number
  /** For stat-number: which stat icon variant to use */
  statVariant?: 'kpis' | 'entries' | 'insights' | 'streak'
}

export interface WidgetLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface DashboardLayout {
  widgets: WidgetConfig[]
  layouts: {
    lg: WidgetLayoutItem[]
    md: WidgetLayoutItem[]
    sm: WidgetLayoutItem[]
  }
  version: number
}

export interface KPI {
  id: string
  name: string
  category: string
  formula: string
  input_fields: string[]
  is_preset: boolean
  room_paths?: string[]
}

export interface DataEntry {
  id: string
  kpi_id: string
  date: string
  values: Record<string, number>
  calculated_value: number
}

export interface Insight {
  id: string
  kpi_id: string | null
  kpi_name: string | null
  insight_text: string
  priority: 'high' | 'medium' | 'low'
  generated_at: string
}

export interface TodayForm {
  date: string
  kpis: {
    kpi_id: string
    kpi_name: string
    category: string
    has_entry_today: boolean
    today_entry: {
      calculated_value: number
    } | null
  }[]
  completed_count: number
  total_count: number
}

export interface KPIWithEntries extends KPI {
  entries: DataEntry[]
  currentValue: number | null
  previousValue: number | null
}

export const WIDGET_DEFAULTS: Record<WidgetType, { w: number; h: number; minW: number; minH: number }> = {
  'stat-number':    { w: 3, h: 2, minW: 2, minH: 2 },
  'line-chart':     { w: 8, h: 5, minW: 4, minH: 3 },
  'bar-chart':      { w: 6, h: 5, minW: 4, minH: 3 },
  'area-chart':     { w: 6, h: 5, minW: 4, minH: 3 },
  'gauge-progress': { w: 3, h: 3, minW: 2, minH: 2 },
  'insights-list':  { w: 4, h: 5, minW: 3, minH: 3 },
  'kpi-cards':      { w: 12, h: 4, minW: 6, minH: 3 },
  'today-progress': { w: 12, h: 3, minW: 6, minH: 2 },
}

export const WIDGET_TYPE_INFO: Record<WidgetType, { label: string; description: string }> = {
  'stat-number':    { label: 'Stat Number',     description: 'Display a single metric with trend indicator' },
  'line-chart':     { label: 'Line Chart',      description: 'Track a KPI over time with a line chart' },
  'bar-chart':      { label: 'Bar Chart',       description: 'Compare KPI values across dates with bars' },
  'area-chart':     { label: 'Area Chart',      description: 'Visualize KPI trends with filled area' },
  'gauge-progress': { label: 'Progress Gauge',  description: "Show today's completion as a circular gauge" },
  'insights-list':  { label: 'Insights',        description: 'Display AI-generated insights list' },
  'kpi-cards':      { label: 'KPI Cards',       description: 'Grid of KPI cards with sparklines' },
  'today-progress': { label: "Today's Progress", description: "Show today's data entry progress bar" },
}
