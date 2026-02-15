import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'
import type { KPIWithEntries, Insight, TodayForm, DataEntry, KPI } from '../types/dashboard'
import type { DateRange } from '../components/DateRangeSelector'

export interface DashboardData {
  kpisWithEntries: KPIWithEntries[]
  insights: Insight[]
  todayForm: TodayForm | null
  streak: number
  isLoading: boolean
  error: string | null
  filterEntriesByRange: (entries: DataEntry[], range: DateRange) => DataEntry[]
  getKPIById: (id: string) => KPIWithEntries | undefined
}

export function useDashboardData(): DashboardData {
  const [kpisWithEntries, setKpisWithEntries] = useState<KPIWithEntries[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [todayForm, setTodayForm] = useState<TodayForm | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpisRes, insightsRes, todayRes, allEntriesRes] = await Promise.all([
          api.get('/api/kpis'),
          api.get('/api/insights'),
          api.get('/api/entries/today'),
          api.get('/api/entries?limit=1000'),
        ])

        const kpisData = kpisRes.data
        const kpis = (Array.isArray(kpisData) ? kpisData : kpisData?.kpis ?? []) as KPI[]
        const insightsData = insightsRes.data
        const insightsList = Array.isArray(insightsData) ? insightsData : insightsData?.insights ?? []
        setInsights(insightsList)
        setTodayForm(todayRes.data)

        // Group all entries by kpi_id
        const allEntriesData = allEntriesRes.data
        const allEntries = (Array.isArray(allEntriesData) ? allEntriesData : allEntriesData?.entries ?? []) as DataEntry[]
        const entriesByKpi = new Map<string, DataEntry[]>()
        for (const entry of allEntries) {
          const kpiId = entry.kpi_id
          if (!entriesByKpi.has(kpiId)) {
            entriesByKpi.set(kpiId, [])
          }
          entriesByKpi.get(kpiId)!.push(entry)
        }

        const kpisWithData: KPIWithEntries[] = kpis.map((kpi) => {
          const entries = entriesByKpi.get(kpi.id) || []
          return {
            ...kpi,
            entries,
            currentValue: entries[0]?.calculated_value ?? null,
            previousValue: entries[1]?.calculated_value ?? null,
          }
        })

        setKpisWithEntries(kpisWithData)

        // Calculate streak
        const uniqueDates = [...new Set(allEntries.map((e) => e.date))].sort().reverse()
        if (uniqueDates.length > 0) {
          let count = 1
          for (let i = 1; i < uniqueDates.length; i++) {
            const current = new Date(uniqueDates[i - 1])
            const previous = new Date(uniqueDates[i])
            const diffDays = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
            if (diffDays === 1) {
              count++
            } else {
              break
            }
          }
          setStreak(count)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
        setError('Failed to load dashboard data')
        setKpisWithEntries([])
        setInsights([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const filterEntriesByRange = useCallback((entries: DataEntry[], range: DateRange) => {
    if (!range.startDate && !range.endDate) return entries
    return entries.filter((e) => {
      if (range.startDate && e.date < range.startDate) return false
      if (range.endDate && e.date > range.endDate) return false
      return true
    })
  }, [])

  const getKPIById = useCallback(
    (id: string) => kpisWithEntries.find((k) => k.id === id),
    [kpisWithEntries]
  )

  return useMemo(
    () => ({
      kpisWithEntries,
      insights,
      todayForm,
      streak,
      isLoading,
      error,
      filterEntriesByRange,
      getKPIById,
    }),
    [kpisWithEntries, insights, todayForm, streak, isLoading, error, filterEntriesByRange, getKPIById]
  )
}
