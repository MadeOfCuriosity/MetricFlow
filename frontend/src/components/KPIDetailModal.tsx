import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import api from '../services/api'
import { Skeleton } from './Skeleton'

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'other'

interface KPI {
  id: string
  name: string
  description: string
  category: string
  formula: string
  input_fields: string[]
  unit: string
  direction: 'up' | 'down'
  is_active: boolean
  is_preset?: boolean
  time_period?: TimePeriod
}

const getTimePeriodLabel = (period: TimePeriod | undefined): string => {
  if (!period) return 'Daily'
  const labels: Record<TimePeriod, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    other: 'Custom',
  }
  return labels[period] || 'Daily'
}

interface HistoryEntry {
  date: string
  value: number
}

interface KPIDetailModalProps {
  kpi: KPI | null
  isOpen: boolean
  onClose: () => void
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Sales: 'text-primary-400',
    Marketing: 'text-purple-400',
    Operations: 'text-warning-400',
    Finance: 'text-success-400',
    Custom: 'text-dark-300',
  }
  return colors[category] || colors.Custom
}

export function KPIDetailModal({ kpi, isOpen, onClose }: KPIDetailModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<{
    current: number | null
    change: number | null
    average: number | null
    entries: number
  }>({ current: null, change: null, average: null, entries: 0 })

  useEffect(() => {
    if (kpi && isOpen) {
      fetchHistory()
    }
  }, [kpi, isOpen])

  const fetchHistory = async () => {
    if (!kpi) return

    setIsLoading(true)
    try {
      const response = await api.get(`/api/entries/query`, {
        params: {
          kpi_id: kpi.id,
          days: 30,
        },
      })

      const entries = response.data.map((entry: any) => ({
        date: entry.date,
        value: entry.calculated_value,
      }))

      setHistory(entries)

      // Calculate stats
      if (entries.length > 0) {
        const values = entries.map((e: HistoryEntry) => e.value)
        const current = values[values.length - 1]
        const previous = values.length > 1 ? values[values.length - 2] : null
        const average = values.reduce((a: number, b: number) => a + b, 0) / values.length

        setStats({
          current,
          change: previous ? ((current - previous) / previous) * 100 : null,
          average,
          entries: entries.length,
        })
      } else {
        setStats({ current: null, change: null, average: null, entries: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch KPI history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatValue = (value: number) => {
    if (kpi?.unit === '%') {
      return `${value.toFixed(1)}%`
    }
    if (kpi?.unit === '$') {
      return `$${value.toLocaleString()}`
    }
    return value.toFixed(2)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-dark-300 mb-1">
          {format(parseISO(label), 'MMM d, yyyy')}
        </p>
        <p className="text-sm font-medium text-foreground">
          {formatValue(payload[0].value)}
        </p>
      </div>
    )
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-2xl shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-dark-700">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      {kpi?.name}
                    </Dialog.Title>
                    <div className="flex items-center gap-3 mt-1">
                      <p className={`text-sm ${getCategoryColor(kpi?.category || '')}`}>
                        {kpi?.category}
                      </p>
                      <span className="text-dark-500">•</span>
                      <div className="flex items-center gap-1 text-sm text-dark-300">
                        <ClockIcon className="w-4 h-4" />
                        {getTimePeriodLabel(kpi?.time_period)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* KPI Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-700/50 rounded-xl p-4">
                      <p className="text-xs text-dark-400 mb-1">Formula</p>
                      <p className="text-sm font-mono text-foreground">{kpi?.formula}</p>
                    </div>
                    <div className="bg-dark-700/50 rounded-xl p-4">
                      <p className="text-xs text-dark-400 mb-1">Required Inputs</p>
                      <div className="flex flex-wrap gap-1">
                        {kpi?.input_fields.map((field) => (
                          <span
                            key={field}
                            className="px-2 py-0.5 bg-dark-600 text-dark-200 text-xs rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {kpi?.description && (
                    <p className="text-sm text-dark-300">{kpi.description}</p>
                  )}

                  {/* Stats */}
                  {isLoading ? (
                    <div className="grid grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-dark-700/50 rounded-xl p-4">
                          <Skeleton className="h-3 w-16 mb-2" />
                          <Skeleton className="h-6 w-12" />
                        </div>
                      ))}
                    </div>
                  ) : stats.entries > 0 ? (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-dark-700/50 rounded-xl p-4">
                        <p className="text-xs text-dark-400 mb-1">Current</p>
                        <p className="text-lg font-semibold text-foreground">
                          {stats.current !== null ? formatValue(stats.current) : '-'}
                        </p>
                      </div>
                      <div className="bg-dark-700/50 rounded-xl p-4">
                        <p className="text-xs text-dark-400 mb-1">Change</p>
                        <div className="flex items-center gap-1">
                          {stats.change !== null && (
                            <>
                              {stats.change >= 0 ? (
                                <ArrowTrendingUpIcon
                                  className={`w-4 h-4 ${
                                    kpi?.direction === 'up' ? 'text-success-400' : 'text-danger-400'
                                  }`}
                                />
                              ) : (
                                <ArrowTrendingDownIcon
                                  className={`w-4 h-4 ${
                                    kpi?.direction === 'down' ? 'text-success-400' : 'text-danger-400'
                                  }`}
                                />
                              )}
                              <span
                                className={`text-lg font-semibold ${
                                  (stats.change >= 0 && kpi?.direction === 'up') ||
                                  (stats.change < 0 && kpi?.direction === 'down')
                                    ? 'text-success-400'
                                    : 'text-danger-400'
                                }`}
                              >
                                {Math.abs(stats.change).toFixed(1)}%
                              </span>
                            </>
                          )}
                          {stats.change === null && (
                            <span className="text-lg font-semibold text-dark-400">-</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-dark-700/50 rounded-xl p-4">
                        <p className="text-xs text-dark-400 mb-1">Average</p>
                        <p className="text-lg font-semibold text-foreground">
                          {stats.average !== null ? formatValue(stats.average) : '-'}
                        </p>
                      </div>
                      <div className="bg-dark-700/50 rounded-xl p-4">
                        <p className="text-xs text-dark-400 mb-1">Entries</p>
                        <p className="text-lg font-semibold text-foreground">{stats.entries}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-dark-700/50 rounded-xl p-6 text-center">
                      <CalendarDaysIcon className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                      <p className="text-sm text-dark-300">No data entries yet</p>
                      <p className="text-xs text-dark-400 mt-1">
                        Start entering data to see statistics
                      </p>
                    </div>
                  )}

                  {/* Chart */}
                  <div>
                    <h3 className="text-sm font-medium text-dark-300 mb-4">
                      Last 30 Days
                    </h3>
                    {isLoading ? (
                      <div className="h-48 bg-dark-700/50 rounded-xl animate-pulse" />
                    ) : history.length > 0 ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={history}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#2a2a2e"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: '#a1a1aa', fontSize: 10 }}
                              tickFormatter={(value) => format(parseISO(value), 'M/d')}
                              axisLine={{ stroke: '#3f3f46' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: '#a1a1aa', fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) =>
                                kpi?.unit === '$' ? `$${value}` : value
                              }
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#5b7fff"
                              strokeWidth={2}
                              dot={{ fill: '#5b7fff', strokeWidth: 0, r: 3 }}
                              activeDot={{ fill: '#5b8fff', strokeWidth: 0, r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-48 bg-dark-700/50 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <ChartBarIcon className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                          <p className="text-sm text-dark-400">No historical data</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-dark-700">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-dark-300 hover:text-foreground transition-colors"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
