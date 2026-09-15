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
  PlusIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useToast } from '../../context/ToastContext'
import { adminService, AdminStats, ActivityEntry } from '../../services/admin'
import { formatDistanceToNow } from 'date-fns'

const ACTIVITY_ICONS: Record<string, string> = {
  data_entry: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  user_joined: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  kpi_created: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  room_created: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  integration_synced: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const { error: showError } = useToast()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [chartDays, setChartDays] = useState<7 | 30>(7)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [statsData, activityData] = await Promise.all([
        adminService.getStats(30),
        adminService.getActivity(10),
      ])
      setStats(statsData)
      setActivities(activityData.activities)
    } catch {
      showError('Failed to load admin dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const chartData = stats
    ? chartDays === 7
      ? stats.completion_rate.slice(-7)
      : stats.completion_rate
    : []

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-dark-900 border border-dark-700 rounded-2xl p-5 animate-pulse"
            >
              <div className="h-4 w-20 bg-dark-800 rounded mb-3" />
              <div className="h-7 w-16 bg-dark-800 rounded" />
            </div>
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
      color: 'text-primary-400 bg-primary-500/10 border border-primary-500/20',
      link: '/settings/users',
    },
    {
      label: 'Total KPIs',
      value: stats?.total_kpis ?? 0,
      icon: ChartBarIcon,
      color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
      link: '/kpis',
    },
    {
      label: 'Total Rooms',
      value: stats?.total_rooms ?? 0,
      icon: FolderIcon,
      color: 'text-purple-400 bg-purple-500/10 border border-purple-500/20',
      link: '/settings/rooms',
    },
    {
      label: 'Active Integrations',
      value: stats?.active_integrations ?? 0,
      icon: ArrowPathRoundedSquareIcon,
      color: 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20',
      link: '/settings/integrations',
    },
    {
      label: "Today's Entries",
      value: stats?.today_data_entries ?? 0,
      icon: CalendarDaysIcon,
      color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
      link: '/entries',
    },
    {
      label: 'Total Data Entries',
      value: stats?.total_data_entries ?? 0,
      icon: DocumentTextIcon,
      color: 'text-dark-300 bg-dark-800 border border-dark-700',
      link: null,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => card.link && navigate(card.link)}
            className={`bg-dark-900 border border-dark-700 rounded-2xl p-5 text-left transition-all group ${
              card.link
                ? 'hover:border-dark-500/80 cursor-pointer shadow-sm'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-dark-400 group-hover:text-dark-300 transition-colors">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl ${card.color}`}>
                <card.icon className="h-4 w-4 stroke-[2]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Completion Rate Chart */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Data Entry Completion Rate
              </h2>
              <p className="text-[11px] text-dark-400 mt-0.5">Tracking submission compliance over time</p>
            </div>
            <div className="flex items-center p-1 bg-dark-950 border border-dark-800 rounded-xl">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setChartDays(d)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    chartDays === d
                      ? 'bg-dark-800 text-foreground shadow-sm'
                      : 'text-dark-400 hover:text-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#737373' }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#737373' }}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderRadius: '12px',
                    color: '#f5f5f5',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Completion Rate']}
                  labelFormatter={(label: string) => label}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#6366f1"
                  fill="url(#completionGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-dark-400 text-xs">
              No entry data recorded for this window
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-foreground tracking-tight mb-4">Quick Actions</h2>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => navigate('/settings/users')}
              className="flex items-center gap-3 w-full p-3 bg-dark-950/40 hover:bg-dark-800/50 border border-dark-800 rounded-xl transition-all text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserPlusIcon className="h-4 w-4 text-primary-400 stroke-[2]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Invite User</p>
                <p className="text-[11px] text-dark-400">Add a team member</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/rooms')}
              className="flex items-center gap-3 w-full p-3 bg-dark-950/40 hover:bg-dark-800/50 border border-dark-800 rounded-xl transition-all text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PlusIcon className="h-4 w-4 text-purple-400 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Create Room</p>
                <p className="text-[11px] text-dark-400">Add a department</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate('/kpis')}
              className="flex items-center gap-3 w-full p-3 bg-dark-950/40 hover:bg-dark-800/50 border border-dark-800 rounded-xl transition-all text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ChartBarIcon className="h-4 w-4 text-emerald-400 stroke-[2]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Add KPI</p>
                <p className="text-[11px] text-dark-400">Define a new metric</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">Recent Activity</h2>
            <p className="text-[11px] text-dark-400 mt-0.5">Audit log of key actions performed across the organization</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings/activity')}
            className="text-xs font-medium text-dark-300 hover:text-foreground transition-colors cursor-pointer"
          >
            View all &rarr;
          </button>
        </div>
        {activities.length === 0 ? (
          <p className="text-xs text-dark-400 text-center py-6">No recent activity recorded</p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 bg-dark-950/30 border border-dark-800/60 rounded-xl hover:bg-dark-800/30 transition-colors"
              >
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 ${
                    ACTIVITY_ICONS[activity.type] || 'bg-dark-800 text-dark-300 border border-dark-700'
                  }`}
                >
                  <div className="h-2 w-2 rounded-full bg-current" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">{activity.description}</p>
                  <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
                    {activity.user_name && (
                      <span className="text-dark-400 font-medium">{activity.user_name}</span>
                    )}
                    <span className="text-dark-500">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
