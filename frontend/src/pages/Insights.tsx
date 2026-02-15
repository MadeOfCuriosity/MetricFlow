import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LightBulbIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { InsightCard, Skeleton, DateRangeSelector } from '../components'
import type { DateRange } from '../components'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

interface Insight {
  id: string
  kpi_id: string
  kpi_name: string
  insight_type: 'trend' | 'anomaly' | 'milestone' | 'recommendation'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  is_read: boolean
  created_at: string
}

interface Statistics {
  total_entries: number
  kpis_tracked: number
  days_of_data: number
}

export function Insights() {
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  const [insights, setInsights] = useState<Insight[]>([])
  const [stats, setStats] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
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
      success('Insights refreshed', 'Analysis complete')
    } catch (err) {
      showError('Refresh failed', 'Could not generate new insights')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/api/insights/${id}`, { is_read: true })
      setInsights((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_read: true } : i))
      )
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const dateFilteredInsights = insights.filter((i) => {
    if (!dateRange.startDate && !dateRange.endDate) return true
    const insightDate = i.created_at?.slice(0, 10)
    if (!insightDate) return true
    if (dateRange.startDate && insightDate < dateRange.startDate) return false
    if (dateRange.endDate && insightDate > dateRange.endDate) return false
    return true
  })

  const filteredInsights =
    filter === 'unread' ? dateFilteredInsights.filter((i) => !i.is_read) : dateFilteredInsights

  const unreadCount = dateFilteredInsights.filter((i) => !i.is_read).length

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Empty state - no insights yet
  const EmptyState = () => {
    const needsMoreData = !stats || stats.days_of_data < 7

    return (
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
        <LightBulbIcon className="w-16 h-16 text-dark-500 mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {needsMoreData ? 'Not enough data yet' : 'No insights available'}
        </h2>
        <p className="text-dark-300 mb-8 max-w-md mx-auto">
          {needsMoreData ? (
            <>
              Insights are generated automatically after you have at least 7 days of
              data. Keep entering your daily metrics and check back soon!
            </>
          ) : (
            <>
              We analyze your data to find trends, anomalies, and opportunities. Try
              refreshing to generate new insights.
            </>
          )}
        </p>

        {needsMoreData ? (
          <div className="bg-dark-800/50 rounded-xl p-6 max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-dark-300">Data collection progress</span>
              <span className="text-sm font-medium text-foreground">
                {stats?.days_of_data || 0} / 7 days
              </span>
            </div>
            <div className="w-full bg-dark-600 rounded-full h-2 mb-4">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(((stats?.days_of_data || 0) / 7) * 100, 100)}%`,
                }}
              />
            </div>
            <button
              onClick={() => navigate('/entries')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              <CalendarDaysIcon className="w-5 h-5" />
              Enter Today's Data
            </button>
          </div>
        ) : (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-6 py-3 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                Generate Insights
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  // No KPIs state
  const NoKPIsState = () => (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
      <ChartBarIcon className="w-16 h-16 text-dark-500 mx-auto mb-6" />
      <h2 className="text-xl font-semibold text-foreground mb-2">No KPIs to analyze</h2>
      <p className="text-dark-300 mb-8 max-w-md mx-auto">
        Set up your KPIs first, then start entering data. Once you have enough data,
        we'll generate insights automatically.
      </p>
      <button
        onClick={() => navigate('/kpis')}
        className="inline-flex items-center gap-2 px-6 py-3 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
      >
        <ChartBarIcon className="w-5 h-5" />
        Set Up KPIs
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-dark-300 mt-1">
            AI-powered analysis of your KPI performance
          </p>
        </div>
        {insights.length > 0 && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-foreground rounded-lg hover:bg-dark-600 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : stats?.kpis_tracked === 0 ? (
        <NoKPIsState />
      ) : insights.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
              <p className="text-sm text-dark-400 mb-1">Total Insights</p>
              <p className="text-2xl font-bold text-foreground">{insights.length}</p>
            </div>
            <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
              <p className="text-sm text-dark-400 mb-1">Unread</p>
              <p className="text-2xl font-bold text-primary-400">{unreadCount}</p>
            </div>
            <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
              <p className="text-sm text-dark-400 mb-1">Data Points</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.total_entries || 0}
              </p>
            </div>
          </div>

          {/* Date range selector */}
          <DateRangeSelector
            defaultPreset="all"
            onChange={(range) => setDateRange(range)}
          />

          {/* Filter tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'border border-primary-500 text-foreground'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-600'
              }`}
            >
              All ({dateFilteredInsights.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'border border-primary-500 text-foreground'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-600'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Insights list */}
          {filteredInsights.length === 0 ? (
            <div className="bg-dark-900 border border-dark-700 rounded-xl p-8 text-center">
              <LightBulbIcon className="w-10 h-10 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-300">No unread insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInsights.map((insight) => (
                <div
                  key={insight.id}
                  onClick={() => !insight.is_read && handleMarkAsRead(insight.id)}
                  className={`cursor-pointer transition-opacity ${
                    insight.is_read ? 'opacity-60' : ''
                  }`}
                >
                  <InsightCard
                    type={insight.insight_type}
                    priority={insight.priority}
                    title={insight.title}
                    description={insight.description}
                    kpiName={insight.kpi_name}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
