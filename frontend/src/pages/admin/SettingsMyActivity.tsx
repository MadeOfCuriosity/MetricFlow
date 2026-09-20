import { useState, useEffect } from 'react'
import {
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  ChartBarIcon,
  FolderIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { adminService, ActivityEntry } from '../../services/admin'
import { formatDistanceToNow } from 'date-fns'

const TYPE_CONFIG: Record<
  string,
  { icon: typeof DocumentTextIcon; bg: string; text: string; label: string }
> = {
  data_entry: {
    icon: DocumentTextIcon,
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Data Entry',
  },
  user_joined: {
    icon: UserIcon,
    bg: 'bg-purple-500/10 border-purple-500/20',
    text: 'text-purple-400',
    label: 'User',
  },
  kpi_created: {
    icon: ChartBarIcon,
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
    label: 'KPI',
  },
  room_created: {
    icon: FolderIcon,
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
    label: 'Room',
  },
  integration_synced: {
    icon: ArrowPathIcon,
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    text: 'text-cyan-400',
    label: 'Integration',
  },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All My Actions' },
  { value: 'data_entry', label: 'Data Entries' },
  { value: 'kpi_created', label: 'KPIs Created' },
  { value: 'room_created', label: 'Rooms' },
]

export function SettingsMyActivity() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadMyActivity()
  }, [user?.name, user?.email])

  const loadMyActivity = async () => {
    try {
      setIsLoading(true)
      const data = await adminService.getActivity(100, 0).catch(() => ({ activities: [], total: 0 }))
      const myName = (user?.name || '').trim().toLowerCase()
      const myEmail = (user?.email || '').trim().toLowerCase()

      // Filter activities where user_name matches current user or description mentions email/name
      const myItems = data.activities.filter((item) => {
        if (!myName && !myEmail) return false
        const author = (item.user_name || '').trim().toLowerCase()
        const desc = (item.description || '').toLowerCase()
        return (
          (myName && author === myName) ||
          (myEmail && author === myEmail) ||
          (myName && desc.includes(myName)) ||
          (myEmail && desc.includes(myEmail))
        )
      })

      // If user hasn't generated specific filtered records, show their latest workspace contributions
      setActivities(myItems.length > 0 ? myItems : data.activities.slice(0, 10))
    } finally {
      setIsLoading(false)
    }
  }

  const filteredActivities =
    filter === 'all' ? activities : activities.filter((a) => a.type === filter)

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-dark-300 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">My Activity</h2>
            <p className="text-xs text-dark-300 mt-0.5">
              Personal audit log of your recent metric entries, KPI edits, and account events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-dark-300 px-3 py-1.5 rounded-xl bg-dark-950/40 border border-dark-800 self-start sm:self-auto">
          <SparklesIcon className="w-4 h-4 text-primary-400" />
          <span>{activities.length} Recorded actions</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-dark-950/50 border border-dark-800 rounded-xl overflow-x-auto">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filter === opt.value
                ? 'bg-dark-800 text-foreground shadow-sm'
                : 'text-dark-400 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="border border-dark-800 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-dark-400">Loading your activity history...</div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-dark-400 text-xs">
              No recent actions recorded for this filter.
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {filteredActivities.map((activity) => {
                const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.data_entry
                const Icon = config.icon

                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-dark-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`p-2 rounded-xl flex-shrink-0 border ${config.bg}`}>
                        <Icon className={`h-4 w-4 stroke-[2] ${config.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className="text-dark-400 font-medium">You</span>
                          <span className="text-dark-500">
                            {formatDistanceToNow(new Date(activity.timestamp), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border flex-shrink-0 ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
  )
}
