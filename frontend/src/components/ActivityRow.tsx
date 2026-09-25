import {
  DocumentTextIcon,
  UserIcon,
  ChartBarIcon,
  FolderIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import type { ActivityEntry } from '../services/admin'

export const ACTIVITY_TYPE_CONFIG: Record<
  string,
  { icon: typeof DocumentTextIcon; bg: string; text: string; label: string }
> = {
  data_entry: {
    icon: DocumentTextIcon,
    bg: 'bg-dark-800 border-dark-700',
    text: 'text-dark-300',
    label: 'Data Entry',
  },
  user_joined: {
    icon: UserIcon,
    bg: 'bg-dark-800 border-dark-700',
    text: 'text-dark-300',
    label: 'User',
  },
  kpi_created: {
    icon: ChartBarIcon,
    bg: 'bg-dark-800 border-dark-700',
    text: 'text-dark-300',
    label: 'KPI',
  },
  room_created: {
    icon: FolderIcon,
    bg: 'bg-dark-800 border-dark-700',
    text: 'text-dark-300',
    label: 'Room',
  },
  integration_synced: {
    icon: ArrowPathIcon,
    bg: 'bg-dark-800 border-dark-700',
    text: 'text-dark-300',
    label: 'Integration',
  },
}

interface ActivityRowProps {
  activity: ActivityEntry
  /** Overrides the author label (e.g. "You"); defaults to the activity's user name */
  author?: string
}

/** One entry in an activity feed: type icon, description, author, relative time and type badge. */
export function ActivityRow({ activity, author }: ActivityRowProps) {
  const config = ACTIVITY_TYPE_CONFIG[activity.type] || ACTIVITY_TYPE_CONFIG.data_entry
  const Icon = config.icon
  const shownAuthor = author ?? activity.user_name

  return (
    <div
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
            {shownAuthor && <span className="text-dark-400 font-medium">{shownAuthor}</span>}
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
}
