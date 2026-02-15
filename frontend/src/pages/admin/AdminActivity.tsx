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
    bg: 'bg-primary-500/20',
    text: 'text-primary-400',
    label: 'Data Entry',
  },
  user_joined: {
    icon: UserIcon,
    bg: 'bg-success-500/20',
    text: 'text-success-400',
    label: 'User',
  },
  kpi_created: {
    icon: ChartBarIcon,
    bg: 'bg-warning-500/20',
    text: 'text-warning-400',
    label: 'KPI',
  },
  room_created: {
    icon: FolderIcon,
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    label: 'Room',
  },
  integration_synced: {
    icon: ArrowPathIcon,
    bg: 'bg-sky-500/20',
    text: 'text-sky-400',
    label: 'Integration',
  },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
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
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              filter === opt.value
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-dark-400 hover:text-foreground hover:bg-dark-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-dark-300">Loading activity...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-dark-400">
            {filter === 'all'
              ? 'No activity yet'
              : 'No activity matches this filter'}
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {filteredActivities.map((activity) => {
              const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.data_entry
              const Icon = config.icon

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-dark-800/30 transition-colors"
                >
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${config.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${config.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {activity.user_name && (
                        <span className="text-xs text-dark-400">
                          {activity.user_name}
                        </span>
                      )}
                      <span className="text-xs text-dark-500">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${config.bg} ${config.text}`}
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
          <div className="p-4 text-center border-t border-dark-700">
            <button
              onClick={() => loadActivities(false)}
              disabled={isLoadingMore}
              className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50 transition-colors"
            >
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
