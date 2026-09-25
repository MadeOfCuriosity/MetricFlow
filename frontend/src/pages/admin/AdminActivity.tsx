import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { adminService, ActivityEntry } from '../../services/admin'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { ActivityRow } from '../../components/ActivityRow'

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
      <SegmentedControl
        size="md"
        surface="raised"
        className="gap-1.5 overflow-x-auto"
        aria-label="Activity filter"
        value={filter}
        onChange={setFilter}
        options={FILTER_OPTIONS}
      />

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
            {filteredActivities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
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
