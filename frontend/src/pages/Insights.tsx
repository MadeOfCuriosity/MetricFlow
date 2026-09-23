import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LightBulbIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  SparklesIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { InsightCard, Skeleton, DateRangeSelector } from '../components'
import type { DateRange } from '../components'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

interface Insight {
  id: string
  kpi_id: string | null
  kpi_name: string | null
  insight_text: string
  priority: 'high' | 'medium' | 'low'
  generated_at: string
}

interface Statistics {
  total_entries: number
  kpis_tracked: number
  days_of_data: number
}

type PriorityFilter = 'all' | 'high' | 'medium' | 'low'

export function Insights() {
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  const [insights, setInsights] = useState<Insight[]>([])
  const [stats, setStats] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [insightsRes, statsRes] = await Promise.all([
        api.get('/api/insights'),
        api.get('/api/insights/statistics'),
      ])
      const insightsData = insightsRes.data
      setInsights(Array.isArray(insightsData) ? insightsData : insightsData?.insights ?? [])
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to fetch insights:', err)
      setInsights([])
      showError('Failed to load insights', 'Please try again later')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await api.post('/api/insights/refresh')
      await fetchData()
      success('Insights refreshed', 'AI analysis complete')
    } catch {
      showError('Refresh failed', 'Could not generate new insights')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Summary counts
  const totalInsightsCount = insights.length
  const highPriorityCount = useMemo(() => insights.filter((i) => i.priority === 'high').length, [insights])
  const mediumPriorityCount = useMemo(() => insights.filter((i) => i.priority === 'medium').length, [insights])
  const lowPriorityCount = useMemo(() => insights.filter((i) => i.priority === 'low').length, [insights])

  const filteredInsights = useMemo(() => {
    return insights.filter((i) => {
      // Priority filter
      if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false

      // Date range filter
      if (dateRange.startDate || dateRange.endDate) {
        const insightDate = i.generated_at?.slice(0, 10)
        if (!insightDate) return true
        if (dateRange.startDate && insightDate < dateRange.startDate) return false
        if (dateRange.endDate && insightDate > dateRange.endDate) return false
      }
      return true
    })
  }, [insights, priorityFilter, dateRange])

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-5 w-48 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
      ))}
    </div>
  )

  // Empty state - not enough data yet
  const EmptyState = () => {
    const needsMoreData = !stats || stats.days_of_data < 7

    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-dark-700 flex items-center justify-center mb-4 shadow-sm">
          <LightBulbIcon className="w-8 h-8 text-dark-400 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {needsMoreData ? 'More Data Needed for Analysis' : 'No Insights Available'}
        </h2>
        <p className="text-sm text-dark-300 max-w-md text-center mb-6">
          {needsMoreData ? (
            <>
              Insights are synthesized automatically once you have recorded at least 7 days of metrics.
              Continue entering your daily logs to activate AI pattern recognition.
            </>
          ) : (
            <>
              Visualize analyzes your operational numbers to uncover anomalies and strategic trends.
              Click below to generate a fresh analysis.
            </>
          )}
        </p>

        {needsMoreData ? (
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 max-w-sm w-full">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-dark-400">Data collection progress</span>
              <span className="text-xs font-semibold text-foreground">
                {stats?.days_of_data || 0} / 7 days
              </span>
            </div>
            <div className="w-full bg-dark-800 rounded-full h-2 mb-4 overflow-hidden border border-dark-700/60">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(((stats?.days_of_data || 0) / 7) * 100, 100)}%`,
                }}
              />
            </div>
            <button
              onClick={() => navigate('/entries')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-dark-950 font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
            >
              <CalendarDaysIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Enter Today's Data</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isRefreshing ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin stroke-[2.5]" />
            ) : (
              <SparklesIcon className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{isRefreshing ? 'Analyzing Data...' : 'Generate Insights'}</span>
          </button>
        )}
      </div>
    )
  }

  // No KPIs state
  const NoKPIsState = () => (
    <div className="py-20 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-dark-700 flex items-center justify-center mb-4 shadow-sm">
        <ChartBarIcon className="w-8 h-8 text-dark-400 stroke-[1.5]" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">No KPIs Configured</h2>
      <p className="text-sm text-dark-300 max-w-md text-center mb-6">
        Set up your organization's key performance indicators first. Once you begin entering daily numbers,
        we'll generate automated insights.
      </p>
      <button
        onClick={() => navigate('/kpis')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
      >
        <ChartBarIcon className="w-4 h-4 stroke-[2.5]" />
        <span>Configure KPIs</span>
      </button>
    </div>
  )

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Insights</h1>
          <p className="text-dark-300 mt-1 text-sm">
            Automated intelligence, anomaly detection, and operational trends across your KPI portfolio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 stroke-[2.5] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Analyzing...' : 'Refresh Insights'}</span>
          </button>
        </div>
      </div>

      {/* Subtle Summary Stat Badges (Rooms Style) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <LightBulbIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Total Insights:</span>
          <span className="font-semibold text-foreground">{totalInsightsCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span className="text-dark-400">High Priority:</span>
          <span className="font-semibold text-foreground">{highPriorityCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <ChartBarIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">KPIs Tracked:</span>
          <span className="font-semibold text-foreground">{stats?.kpis_tracked || 0}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <CalendarDaysIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">History:</span>
          <span className="font-semibold text-foreground">{stats?.days_of_data || 0} days</span>
        </div>
      </div>

      {/* Toolbar: Priority Capsule Segment & Date Range */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Priority Segment Tabs */}
        <div className="flex items-center p-1 bg-dark-900 border border-dark-700 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setPriorityFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              priorityFilter === 'all'
                ? 'bg-dark-800 text-foreground shadow-sm'
                : 'text-dark-400 hover:text-foreground'
            }`}
          >
            All ({totalInsightsCount})
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter('high')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              priorityFilter === 'high'
                ? 'bg-dark-800 text-foreground shadow-sm'
                : 'text-dark-400 hover:text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>High ({highPriorityCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter('medium')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              priorityFilter === 'medium'
                ? 'bg-dark-800 text-foreground shadow-sm'
                : 'text-dark-400 hover:text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Medium ({mediumPriorityCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter('low')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              priorityFilter === 'low'
                ? 'bg-dark-800 text-foreground shadow-sm'
                : 'text-dark-400 hover:text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            <span>Low ({lowPriorityCount})</span>
          </button>
        </div>

        {/* Date Range Selector */}
        <DateRangeSelector
          defaultPreset="all"
          onChange={(range) => setDateRange(range)}
        />
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : stats?.kpis_tracked === 0 ? (
        <NoKPIsState />
      ) : insights.length === 0 ? (
        <EmptyState />
      ) : filteredInsights.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-dark-900/40 border border-dark-700/70 rounded-2xl">
          <FunnelIcon className="w-8 h-8 text-dark-400 mb-2 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-foreground">No insights match current filters</h3>
          <p className="text-xs text-dark-400 mt-1">Try selecting a different priority level or expanding the date range.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              priority={insight.priority}
              text={insight.insight_text}
              kpiName={insight.kpi_name}
              generatedAt={insight.generated_at}
            />
          ))}
        </div>
      )}
    </div>
  )
}
