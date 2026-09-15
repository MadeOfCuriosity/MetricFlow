import { useState, useEffect } from 'react'
import {
  DocumentTextIcon,
  UserIcon,
  ChartBarIcon,
  FolderIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '../../context/ToastContext'
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
  { value: 'all', label: 'All Activity' },
  { value: 'data_entry', label: 'Data Entries' },
  { value: 'user_joined', label: 'Users' },
  { value: 'kpi_created', label: 'KPIs' },
  { value: 'room_created', label: 'Rooms' },
  { value: 'integration_synced', label: 'Integrations' },
]

export function AdminActivity() {
  const { error: showError } = useToast()
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [filter, setFilter] = useState('all')
  const [offset, setOffset] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    loadActivities(true)
  }, [])

  const loadActivities = async (reset = false) => {
    const newOffset = reset ? 0 : offset
    if (reset) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const data = await adminService.getActivity(PAGE_SIZE, newOffset)
      if (reset) {
        setActivities(data.activities)
      } else {
        setActivities((prev) => [...prev, ...data.activities])
      }
      setTotal(data.total)
      setOffset(newOffset + PAGE_SIZE)
    } catch {
      showError('Failed to load activity')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const filteredActivities =
    filter === 'all'
      ? activities
      : activities.filter((a) => a.type === filter)

  const hasMore = offset < total

  return (
    <div className="space-y-6">
      {/* Filter segment control */}
      <div className="flex items-center gap-1.5 p-1 bg-dark-900 border border-dark-700 rounded-xl overflow-x-auto">
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

      {/* Activity List */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-dark-400">Loading activity log...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-dark-400 text-xs">
            {filter === 'all'
              ? 'No activity recorded yet.'
              : 'No activity matches this filter criteria.'}
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
                    <div
                      className={`p-2 rounded-xl flex-shrink-0 border ${config.bg}`}
                    >
                      <Icon className={`h-4 w-4 stroke-[2] ${config.text}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        {activity.user_name && (
                          <span className="text-dark-400 font-medium">
                            {activity.user_name}
                          </span>
                        )}
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

        {/* Load more */}
        {hasMore && !isLoading && (
          <div className="p-4 text-center border-t border-dark-800 bg-dark-950/30">
            <button
              type="button"
              onClick={() => loadActivities(false)}
              disabled={isLoadingMore}
              className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-foreground bg-dark-800 border border-dark-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoadingMore ? 'Loading...' : 'Load more activity'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
