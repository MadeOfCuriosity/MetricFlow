import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ChartBarIcon,
  LightBulbIcon,
  PlusIcon,
  CalendarDaysIcon,
  FireIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { KPICard, InsightCard, TrendChart, DateRangeSelector, getPresetLabel } from '../components'
import type { DateRange, DateRangePreset } from '../components'
import api from '../services/api'

interface KPI {
  id: string
  name: string
  category: string
  formula: string
  input_fields: string[]
  is_preset: boolean
  room_paths?: string[]
}

interface DataEntry {
  id: string
  date: string
  values: Record<string, number>
  calculated_value: number
}

interface Insight {
  id: string
  kpi_id: string | null
  kpi_name: string | null
  insight_text: string
  priority: 'high' | 'medium' | 'low'
  generated_at: string
}

interface TodayForm {
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

interface KPIWithEntries extends KPI {
  entries: DataEntry[]
  currentValue: number | null
  previousValue: number | null
}

export function Dashboard() {
  const { user, organization } = useAuth()
  const [kpisWithEntries, setKpisWithEntries] = useState<KPIWithEntries[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [todayForm, setTodayForm] = useState<TodayForm | null>(null)
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const [activePreset, setActivePreset] = useState<DateRangePreset>('monthly')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpisRes, insightsRes, todayRes] = await Promise.all([
          api.get('/api/kpis'),
          api.get('/api/insights'),
          api.get('/api/entries/today'),
        ])

        const kpisData = kpisRes.data
        const kpis = (Array.isArray(kpisData) ? kpisData : kpisData?.kpis ?? []) as KPI[]
        const insightsData = insightsRes.data
        const insightsList = Array.isArray(insightsData) ? insightsData : insightsData?.insights ?? []
        setInsights(insightsList)
        setTodayForm(todayRes.data)

        // Fetch entries for each KPI
        const kpisWithData: KPIWithEntries[] = await Promise.all(
          kpis.map(async (kpi) => {
            try {
              const entriesRes = await api.get(`/api/entries?kpi_id=${kpi.id}&limit=365`)
              const entriesData = entriesRes.data
              const entries = (Array.isArray(entriesData) ? entriesData : entriesData?.entries ?? []) as DataEntry[]
              return {
                ...kpi,
                entries,
                currentValue: entries[0]?.calculated_value ?? null,
                previousValue: entries[1]?.calculated_value ?? null,
              }
            } catch {
              return {
                ...kpi,
                entries: [],
                currentValue: null,
                previousValue: null,
              }
            }
          })
        )

        setKpisWithEntries(kpisWithData)

        // Select first KPI by default
        if (kpisWithData.length > 0) {
          setSelectedKPI(kpisWithData[0].id)
        }

        // Calculate streak (simplified - count consecutive days with entries)
        calculateStreak(todayRes.data)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setKpisWithEntries([])
        setInsights([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const calculateStreak = (todayData: TodayForm) => {
    // Simple streak calculation based on today's completion
    if (todayData && todayData.completed_count > 0) {
      setStreak((prev) => prev + 1)
    }
  }

  const handleDateRangeChange = (range: DateRange, preset?: DateRangePreset) => {
    setDateRange(range)
    if (preset) setActivePreset(preset)
  }

  const filterEntriesByRange = (entries: DataEntry[]) => {
    if (!dateRange.startDate && !dateRange.endDate) return entries
    return entries.filter((e) => {
      if (dateRange.startDate && e.date < dateRange.startDate) return false
      if (dateRange.endDate && e.date > dateRange.endDate) return false
      return true
    })
  }

  const filteredInsights = insights.filter((i) => {
    if (!dateRange.startDate && !dateRange.endDate) return true
    const insightDate = i.generated_at.slice(0, 10)
    if (dateRange.startDate && insightDate < dateRange.startDate) return false
    if (dateRange.endDate && insightDate > dateRange.endDate) return false
    return true
  })
  const displayedInsights = filteredInsights.slice(0, 5)

  const selectedKPIData = kpisWithEntries.find((k) => k.id === selectedKPI)
  const filteredEntries = selectedKPIData ? filterEntriesByRange(selectedKPIData.entries) : []
  const chartData = filteredEntries
    .slice()
    .reverse()
    .map((e) => ({
      date: e.date,
      value: e.calculated_value,
    }))

  const completionPercentage = todayForm
    ? Math.round((todayForm.completed_count / todayForm.total_count) * 100) || 0
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-dark-300 mt-1">
            Here's what's happening with {organization?.name} today.
          </p>
        </div>
        <Link
          to="/entries"
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Enter today's data
        </Link>
      </div>

      {/* Date range selector */}
      <DateRangeSelector
        defaultPreset="monthly"
        onChange={(range, preset) => handleDateRangeChange(range, preset)}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/15 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{kpisWithEntries.length}</p>
              <p className="text-xs text-dark-400">KPIs Tracked</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-500/15 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="w-5 h-5 text-success-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {todayForm?.completed_count || 0}/{todayForm?.total_count || 0}
              </p>
              <p className="text-xs text-dark-400">Today's Entries</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-500/15 rounded-lg flex items-center justify-center">
              <LightBulbIcon className="w-5 h-5 text-warning-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{filteredInsights.length}</p>
              <p className="text-xs text-dark-400">Active Insights</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-600/15 rounded-lg flex items-center justify-center">
              <FireIcon className="w-5 h-5 text-warning-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{streak}</p>
              <p className="text-xs text-dark-400">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {kpisWithEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your KPIs</h2>
            <Link to="/kpis" className="text-sm text-primary-400 hover:text-primary-300">
              Manage KPIs →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {kpisWithEntries.map((kpi) => {
              const rangeEntries = filterEntriesByRange(kpi.entries)
              return (
                <KPICard
                  key={kpi.id}
                  kpiId={kpi.id}
                  name={kpi.name}
                  value={rangeEntries[0]?.calculated_value ?? null}
                  previousValue={rangeEntries[1]?.calculated_value ?? null}
                  category={kpi.category}
                  roomPaths={kpi.room_paths}
                  sparklineData={rangeEntries
                    .slice(0, 7)
                    .reverse()
                    .map((e) => ({ value: e.calculated_value }))}
                  onClick={() => setSelectedKPI(kpi.id)}
                  isSelected={selectedKPI === kpi.id}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - takes 2 columns */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {selectedKPIData?.name || 'Select a KPI'}
              </h2>
              <p className="text-sm text-dark-400">{getPresetLabel(activePreset)}</p>
            </div>
            {selectedKPIData && (
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  {selectedKPIData.currentValue?.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }) || '—'}
                </p>
                <p className="text-sm text-dark-400">Current value</p>
              </div>
            )}
          </div>

          {chartData.length > 0 ? (
            <TrendChart data={chartData} kpiName={selectedKPIData?.name || ''} height={280} />
          ) : (
            <div className="flex items-center justify-center h-[280px] bg-dark-800/30 rounded-lg">
              <div className="text-center">
                <ChartBarIcon className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400">No data to display</p>
                <Link
                  to="/entries"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add your first entry
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Insights panel */}
        <div className="bg-dark-900 border border-dark-700 rounded-xl shadow-card">
          <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Latest Insights</h2>
            <Link to="/insights" className="text-sm text-primary-400 hover:text-primary-300">
              View all
            </Link>
          </div>
          <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto">
            {displayedInsights.length === 0 ? (
              <div className="text-center py-8">
                <LightBulbIcon className="w-10 h-10 text-dark-500 mx-auto mb-3" />
                <p className="text-sm text-dark-400">
                  {filteredInsights.length === 0 && insights.length > 0
                    ? 'No insights in this date range.'
                    : 'No insights yet. Enter data to get AI-powered insights.'}
                </p>
              </div>
            ) : (
              displayedInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  id={insight.id}
                  text={insight.insight_text}
                  priority={insight.priority}
                  kpiName={insight.kpi_name}
                  generatedAt={insight.generated_at}
                  compact
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Today's progress */}
      {todayForm && todayForm.total_count > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Today's Progress</h2>
              <p className="text-sm text-dark-400">
                {todayForm.completed_count} of {todayForm.total_count} KPIs completed
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{completionPercentage}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-dark-700 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                completionPercentage === 100
                  ? 'bg-success-500'
                  : completionPercentage > 50
                  ? 'bg-primary-500'
                  : 'bg-warning-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          {/* KPI completion status */}
          <div className="flex flex-wrap gap-2">
            {todayForm.kpis.map((kpi) => (
              <div
                key={kpi.kpi_id}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  kpi.has_entry_today
                    ? 'bg-success-500/10 text-success-400 border border-success-500/20'
                    : 'bg-dark-800 text-dark-300 border border-dark-600'
                }`}
              >
                {kpi.kpi_name}
                {kpi.has_entry_today && kpi.today_entry && (
                  <span className="ml-2 font-medium">
                    {kpi.today_entry.calculated_value.toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {completionPercentage < 100 && (
            <Link
              to="/entries"
              className="mt-4 inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
            >
              Complete remaining entries →
            </Link>
          )}
        </div>
      )}

      {/* Empty state */}
      {kpisWithEntries.length === 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center shadow-card">
          <ChartBarIcon className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Get started with KPIs</h2>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">
            Set up your first KPI to start tracking your business metrics. You can use preset KPIs
            or create custom ones with the AI builder.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/kpis"
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add KPIs
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
