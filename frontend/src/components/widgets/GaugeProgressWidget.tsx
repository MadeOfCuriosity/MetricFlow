import type { DashboardData } from '../../hooks/useDashboardData'
import { CHART_COLORS } from '../../lib/chartColors'

interface GaugeProgressWidgetProps {
  data: DashboardData
}

export function GaugeProgressWidget({ data }: GaugeProgressWidgetProps) {
  const { todayForm } = data
  const completed = todayForm?.completed_count || 0
  const total = todayForm?.total_count || 0
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  // SVG circular progress
  const size = 120
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (percentage === 100) return CHART_COLORS.up
    if (percentage > 50) return CHART_COLORS.brand
    return CHART_COLORS.warning
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={CHART_COLORS.track}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{percentage}%</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-dark-300 mt-3">
        {completed} of {total} completed
      </p>
    </div>
  )
}
