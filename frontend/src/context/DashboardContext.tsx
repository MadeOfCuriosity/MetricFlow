import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { WidgetConfig, DashboardLayout, WidgetLayoutItem } from '../types/dashboard'
import { WIDGET_DEFAULTS } from '../types/dashboard'
import { useDashboardData, type DashboardData } from '../hooks/useDashboardData'
import type { DateRange, DateRangePreset } from '../components/DateRangeSelector'

const STORAGE_KEY = 'metricflow-dashboard-layout'
const LAYOUT_VERSION = 1

interface DashboardContextType {
  data: DashboardData
  layout: DashboardLayout
  isEditMode: boolean
  setEditMode: (editing: boolean) => void
  addWidget: (config: Omit<WidgetConfig, 'id'>) => void
  removeWidget: (widgetId: string) => void
  updateWidgetConfig: (widgetId: string, updates: Partial<WidgetConfig>) => void
  updateLayouts: (allLayouts: Record<string, WidgetLayoutItem[]>) => void
  resetToDefault: () => void
  selectedKPI: string | null
  setSelectedKPI: (id: string | null) => void
  dateRange: DateRange
  activePreset: DateRangePreset
  handleDateRangeChange: (range: DateRange, preset?: DateRangePreset) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

function generateId(): string {
  return 'w-' + Math.random().toString(36).slice(2, 9)
}

function getDefaultLayout(): DashboardLayout {
  const widgets: WidgetConfig[] = [
    { id: 'default-stat-1', type: 'stat-number', title: 'KPIs Tracked', statVariant: 'kpis' },
    { id: 'default-stat-2', type: 'stat-number', title: "Today's Entries", statVariant: 'entries' },
    { id: 'default-stat-3', type: 'stat-number', title: 'Active Insights', statVariant: 'insights' },
    { id: 'default-stat-4', type: 'stat-number', title: 'Day Streak', statVariant: 'streak' },
    { id: 'default-kpi-cards', type: 'kpi-cards', title: 'Your KPIs' },
    { id: 'default-line-chart', type: 'line-chart', title: 'KPI Trend' },
    { id: 'default-insights', type: 'insights-list', title: 'Latest Insights', maxItems: 5 },
    { id: 'default-today', type: 'today-progress', title: "Today's Progress" },
  ]

  const lg: WidgetLayoutItem[] = [
    { i: 'default-stat-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-stat-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-stat-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-stat-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-kpi-cards', x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'default-line-chart', x: 0, y: 6, w: 8, h: 5, minW: 4, minH: 3 },
    { i: 'default-insights', x: 8, y: 6, w: 4, h: 5, minW: 3, minH: 3 },
    { i: 'default-today', x: 0, y: 11, w: 12, h: 3, minW: 6, minH: 2 },
  ]

  const md: WidgetLayoutItem[] = [
    { i: 'default-stat-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-stat-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-stat-3', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-stat-4', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-kpi-cards', x: 0, y: 4, w: 6, h: 4, minW: 6, minH: 3 },
    { i: 'default-line-chart', x: 0, y: 8, w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'default-insights', x: 0, y: 13, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'default-today', x: 0, y: 18, w: 6, h: 3, minW: 6, minH: 2 },
  ]

  const sm: WidgetLayoutItem[] = widgets.map((w, idx) => ({
    i: w.id,
    x: 0,
    y: idx * 3,
    w: 1,
    h: 3,
    minW: 1,
    minH: 2,
  }))

  return { widgets, layouts: { lg, md, sm }, version: LAYOUT_VERSION }
}

function loadLayout(): DashboardLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DashboardLayout
    if (parsed.version !== LAYOUT_VERSION) return null
    if (!parsed.widgets || !parsed.layouts) return null
    return parsed
  } catch {
    return null
  }
}

function saveLayout(layout: DashboardLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const data = useDashboardData()
  const [layout, setLayout] = useState<DashboardLayout>(() => loadLayout() || getDefaultLayout())
  const [isEditMode, setEditMode] = useState(false)
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const [activePreset, setActivePreset] = useState<DateRangePreset>('monthly')

  // Select first KPI once data loads
  useEffect(() => {
    if (!selectedKPI && data.kpisWithEntries.length > 0) {
      setSelectedKPI(data.kpisWithEntries[0].id)
    }
  }, [data.kpisWithEntries, selectedKPI])

  // Debounced save to localStorage
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveLayout(layout), 300)
    return () => clearTimeout(saveTimeoutRef.current)
  }, [layout])

  const addWidget = useCallback((config: Omit<WidgetConfig, 'id'>) => {
    const id = generateId()
    const defaults = WIDGET_DEFAULTS[config.type]
    const newWidget: WidgetConfig = { ...config, id }

    setLayout((prev) => {
      const maxY = prev.layouts.lg.reduce((max, item) => Math.max(max, item.y + item.h), 0)
      const newLayoutItem: WidgetLayoutItem = {
        i: id,
        x: 0,
        y: maxY,
        w: defaults.w,
        h: defaults.h,
        minW: defaults.minW,
        minH: defaults.minH,
      }
      return {
        ...prev,
        widgets: [...prev.widgets, newWidget],
        layouts: {
          lg: [...prev.layouts.lg, newLayoutItem],
          md: [...prev.layouts.md, { ...newLayoutItem, w: Math.min(defaults.w, 6) }],
          sm: [...prev.layouts.sm, { ...newLayoutItem, x: 0, w: 1, h: 3 }],
        },
      }
    })
  }, [])

  const removeWidget = useCallback((widgetId: string) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
      layouts: {
        lg: prev.layouts.lg.filter((l) => l.i !== widgetId),
        md: prev.layouts.md.filter((l) => l.i !== widgetId),
        sm: prev.layouts.sm.filter((l) => l.i !== widgetId),
      },
    }))
  }, [])

  const updateWidgetConfig = useCallback((widgetId: string, updates: Partial<WidgetConfig>) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
    }))
  }, [])

  const updateLayouts = useCallback((allLayouts: Record<string, WidgetLayoutItem[]>) => {
    setLayout((prev) => ({
      ...prev,
      layouts: {
        lg: allLayouts.lg || prev.layouts.lg,
        md: allLayouts.md || prev.layouts.md,
        sm: allLayouts.sm || prev.layouts.sm,
      },
    }))
  }, [])

  const resetToDefault = useCallback(() => {
    const defaultLayout = getDefaultLayout()
    setLayout(defaultLayout)
    saveLayout(defaultLayout)
  }, [])

  const handleDateRangeChange = useCallback((range: DateRange, preset?: DateRangePreset) => {
    setDateRange(range)
    if (preset) setActivePreset(preset)
  }, [])

  return (
    <DashboardContext.Provider
      value={{
        data,
        layout,
        isEditMode,
        setEditMode,
        addWidget,
        removeWidget,
        updateWidgetConfig,
        updateLayouts,
        resetToDefault,
        selectedKPI,
        setSelectedKPI,
        dateRange,
        activePreset,
        handleDateRangeChange,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
