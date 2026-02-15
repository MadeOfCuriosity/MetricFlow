import {
  ChartBarIcon,
  CalendarDaysIcon,
  LightBulbIcon,
  FireIcon,
} from '@heroicons/react/24/outline'
import type { WidgetConfig } from '../../types/dashboard'
import type { DashboardData } from '../../hooks/useDashboardData'

interface StatNumberWidgetProps {
  config: WidgetConfig
  data: DashboardData
  filteredInsightsCount: number
}

const STAT_VARIANTS = {
  kpis: {
    icon: ChartBarIcon,
    bgColor: 'bg-primary-500/15',
    iconColor: 'text-primary-400',
    label: 'KPIs Tracked',
  },
  entries: {
    icon: CalendarDaysIcon,
    bgColor: 'bg-success-500/15',
    iconColor: 'text-success-400',
    label: "Today's Entries",
  },
  insights: {
    icon: LightBulbIcon,
    bgColor: 'bg-warning-500/15',
    iconColor: 'text-warning-400',
    label: 'Active Insights',
  },
  streak: {
    icon: FireIcon,
    bgColor: 'bg-warning-600/15',
    iconColor: 'text-warning-400',
    label: 'Day Streak',
  },
} as const

export function StatNumberWidget({ config, data, filteredInsightsCount }: StatNumberWidgetProps) {
  const variant = config.statVariant || 'kpis'
  const meta = STAT_VARIANTS[variant]
  const Icon = meta.icon

  const getValue = () => {
    switch (variant) {
      case 'kpis':
        return data.kpisWithEntries.length
      case 'entries':
        return `${data.todayForm?.completed_count || 0}/${data.todayForm?.total_count || 0}`
      case 'insights':
        return filteredInsightsCount
      case 'streak':
        return data.streak
      default:
        return 0
    }
  }

  return (
    <div className="h-full flex items-center">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${meta.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${meta.iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{getValue()}</p>
          <p className="text-xs text-dark-400">{meta.label}</p>
        </div>
      </div>
    </div>
  )
}
