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
  data_entry: 'bg-primary-500/20 text-primary-400',
  user_joined: 'bg-success-500/20 text-success-400',
  kpi_created: 'bg-warning-500/20 text-warning-400',
  room_created: 'bg-purple-500/20 text-purple-400',
  integration_synced: 'bg-sky-500/20 text-sky-400',
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
              className="bg-dark-900 border border-dark-700 rounded-xl p-5 animate-pulse"
            >
              <div className="h-4 w-20 bg-dark-700 rounded mb-3" />
              <div className="h-8 w-16 bg-dark-700 rounded" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 animate-pulse">
          <div className="h-4 w-40 bg-dark-700 rounded mb-4" />
          <div className="h-48 bg-dark-700/50 rounded" />
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.total_users ?? 0,
      icon: UsersIcon,
      color: 'bg-primary-500/20 text-primary-400',
      link: '/admin/users',
    },
    {
      label: 'Total KPIs',
      value: stats?.total_kpis ?? 0,
      icon: ChartBarIcon,
      color: 'bg-success-500/20 text-success-400',
      link: '/kpis',
    },
    {
      label: 'Total Rooms',
      value: stats?.total_rooms ?? 0,
      icon: FolderIcon,
      color: 'bg-purple-500/20 text-purple-400',
      link: '/admin/rooms',
    },
    {
      label: 'Active Integrations',
      value: stats?.active_integrations ?? 0,
      icon: ArrowPathRoundedSquareIcon,
      color: 'bg-sky-500/20 text-sky-400',
      link: '/admin/integrations',
    },
    {
      label: "Today's Entries",
      value: stats?.today_data_entries ?? 0,
      icon: CalendarDaysIcon,
      color: 'bg-warning-500/20 text-warning-400',
      link: '/entries',
    },
    {
      label: 'Total Entries',
      value: stats?.total_data_entries ?? 0,
      icon: DocumentTextIcon,
      color: 'bg-dark-500/30 text-dark-300',
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
            onClick={() => card.link && navigate(card.link)}
            className={`bg-dark-900 border border-dark-700 rounded-xl p-5 text-left transition-colors ${
              card.link ? 'hover:border-dark-500 cursor-pointer' : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-dark-300">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Completion Rate Chart */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Data Entry Completion Rate
            </h2>
            <div className="flex gap-1 bg-dark-800 rounded-lg p-0.5">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    chartDays === d
                      ? 'bg-dark-600 text-foreground'
                      : 'text-dark-400 hover:text-dark-200'
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
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
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
            <div className="h-[220px] flex items-center justify-center text-dark-400 text-sm">
              No data yet
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-3 w-full p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors text-left"
            >
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <UserPlusIcon className="h-4 w-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Invite User</p>
                <p className="text-xs text-dark-400">Add a new team member</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/admin/rooms')}
              className="flex items-center gap-3 w-full p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors text-left"
            >
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <PlusIcon className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create Room</p>
                <p className="text-xs text-dark-400">Add a new department</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/kpis')}
              className="flex items-center gap-3 w-full p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors text-left"
            >
              <div className="p-2 bg-success-500/20 rounded-lg">
                <ChartBarIcon className="h-4 w-4 text-success-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create KPI</p>
                <p className="text-xs text-dark-400">Define a new metric</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          <button
            onClick={() => navigate('/admin/activity')}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            View all
          </button>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-dark-400 text-center py-6">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-800/50 transition-colors"
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${
                    ACTIVITY_ICONS[activity.type] || 'bg-dark-600 text-dark-300'
                  }`}
                >
                  <div className="h-3 w-3 rounded-full bg-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {activity.user_name && (
                      <span className="text-xs text-dark-400">{activity.user_name}</span>
                    )}
                    <span className="text-xs text-dark-500">
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
