import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UsersIcon,
  ChartBarIcon,
  FolderIcon,
  ArrowPathRoundedSquareIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ActivityHeatmap } from '../../components/ActivityHeatmap'
import { useToast } from '../../context/ToastContext'
import { adminService, AdminStats } from '../../services/admin'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { CHART_COLORS } from '../../lib/chartColors'

interface BarTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CompletionTooltip({ active, payload, label }: BarTooltipProps) {
  if (active && payload && payload.length) {
    const rate = payload[0].value
    return (
      <div className="bg-dark-900/95 backdrop-blur-md border border-dark-700 rounded-xl px-3.5 py-2.5 shadow-xl text-left">
        <p className="text-[11px] font-medium text-dark-400 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              rate >= 100
                ? 'bg-success-400 ring-2 ring-success-400/20'
                : rate > 0
                ? 'bg-brand ring-2 ring-brand/20'
                : 'bg-dark-600'
            }`}
          />
          <span className="text-xs font-semibold text-foreground">
            {rate}% Completion
          </span>
        </div>
      </div>
    )
  }
  return null
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const { error: showError } = useToast()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const statsData = await adminService.getStats(30)
      setStats(statsData)
    } catch {
      showError('Failed to load admin dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const chartData = stats
    ? chartDays === 7
      ? stats.completion_rate.slice(-7)
      : chartDays === 14
      ? stats.completion_rate.slice(-14)
      : stats.completion_rate
    : []

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stat badges skeleton */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-7 w-28 bg-dark-900 border border-dark-700/70 rounded-lg animate-pulse"
            />
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 animate-pulse">
          <div className="h-4 w-40 bg-dark-800 rounded mb-4" />
          <div className="h-48 bg-dark-800/50 rounded" />
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.total_users ?? 0,
      icon: UsersIcon,
      link: '#users',
    },
    {
      label: 'Total KPIs',
      value: stats?.total_kpis ?? 0,
      icon: ChartBarIcon,
      link: '/kpis',
    },
    {
      label: 'Total Rooms',
      value: stats?.total_rooms ?? 0,
      icon: FolderIcon,
      link: '/rooms',
    },
    {
      label: 'Active Integrations',
      value: stats?.active_integrations ?? 0,
      icon: ArrowPathRoundedSquareIcon,
      link: '/settings/integrations',
    },
    {
      label: "Today's Entries",
      value: stats?.today_data_entries ?? 0,
      icon: CalendarDaysIcon,
      link: '/entries',
    },
    {
      label: 'Total Data Entries',
      value: stats?.total_data_entries ?? 0,
      icon: DocumentTextIcon,
      link: null,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Subtle Overview Summary Badges matching Rooms.tsx lines 150-176 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {statCards.map((card) => {
            const isClickable = !!card.link
            const Component = isClickable ? 'button' : 'div'
            return (
              <Component
                key={card.label}
                type={isClickable ? 'button' : undefined}
                onClick={() => {
                  if (!card.link) return
                  if (card.link.startsWith('#')) {
                    const el = document.getElementById(card.link.slice(1))
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      return
                    }
                  }
                  navigate(card.link)
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs transition-all ${
                  isClickable
                    ? 'hover:border-dark-500/80 hover:bg-dark-800/60 cursor-pointer shadow-xs'
                    : 'cursor-default'
                }`}
              >
                <card.icon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
                <span className="text-dark-400">{card.label}:</span>
                <span className="font-semibold text-foreground">{card.value}</span>
              </Component>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('users')
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            } else {
              navigate('/settings#users')
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-700/80 hover:border-dark-600 text-xs font-semibold text-dark-300 hover:text-foreground transition-all cursor-pointer shadow-xs"
        >
          <UserPlusIcon className="w-3.5 h-3.5 text-brand stroke-[2]" />
          <span>Invite User</span>
        </button>
      </div>

      {/* Two column layout: Data Entry Completion Rate (Bar Chart) + GitHub Activity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Completion Rate Bar Chart */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Data Entry Completion Rate
              </h2>
              <p className="text-[11px] text-dark-400 mt-0.5">Tracking submission compliance over time</p>
            </div>
            <SegmentedControl
              size="xs"
              surface="inset"
              aria-label="Chart range"
              value={chartDays}
              onChange={setChartDays}
              options={([7, 14, 30] as const).map((d) => ({ value: d, label: `${d}d` }))}
            />
          </div>

          {chartData.length > 0 ? (
            <div className="my-auto py-2">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    content={<CompletionTooltip />}
                    cursor={{ fill: 'rgb(var(--color-dark-700) / 0.4)', radius: 4 }}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.rate >= 100
                            ? CHART_COLORS.up
                            : entry.rate > 0
                            ? CHART_COLORS.brand
                            : CHART_COLORS.track
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-dark-400 text-xs">
              No entry data recorded for this window
            </div>
          )}

          {/* Indicator legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-dark-800/80 text-[11px] text-dark-400 select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success-400 inline-block" />
              <span className="text-dark-300">100% Target Met</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand inline-block" />
              <span className="text-dark-300">Partial Completion</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-dark-700 inline-block" />
              <span className="text-dark-400">0% Inactive</span>
            </span>
          </div>
        </div>

        {/* GitHub-style Activity Heatmap beside it */}
        <ActivityHeatmap />
      </div>
    </div>
  )
}
