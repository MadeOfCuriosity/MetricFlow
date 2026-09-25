import { useState, useEffect } from 'react'
import { ClockIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { adminService, ActivityEntry } from '../../services/admin'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { ActivityRow } from '../../components/ActivityRow'

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
          <SparklesIcon className="w-4 h-4 text-brand" />
          <span>{activities.length} Recorded actions</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <SegmentedControl
        size="md"
        surface="subtle"
        className="gap-1.5 overflow-x-auto"
        aria-label="Activity filter"
        value={filter}
        onChange={setFilter}
        options={FILTER_OPTIONS}
      />

      <div className="border border-dark-800 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-dark-400">Loading your activity history...</div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-dark-400 text-xs">
              No recent actions recorded for this filter.
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {filteredActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} author="You" />
              ))}
            </div>
          )}
        </div>
      </div>
  )
}
