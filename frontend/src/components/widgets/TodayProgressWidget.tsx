import { Link } from 'react-router-dom'
import type { DashboardData } from '../../hooks/useDashboardData'

interface TodayProgressWidgetProps {
  data: DashboardData
}

export function TodayProgressWidget({ data }: TodayProgressWidgetProps) {
  const { todayForm } = data

  if (!todayForm || todayForm.total_count === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-dark-400">No KPIs to track today</p>
      </div>
    )
  }

  const completionPercentage = Math.round((todayForm.completed_count / todayForm.total_count) * 100) || 0

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <p className="text-sm text-dark-400">
            {todayForm.completed_count} of {todayForm.total_count} KPIs completed
          </p>
        </div>
        <p className="text-xl font-bold text-foreground">{completionPercentage}%</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-dark-700 rounded-full h-3 mb-3 flex-shrink-0">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            completionPercentage === 100
              ? 'bg-success-500'
              : completionPercentage > 50
              ? 'bg-primary-500'
              : 'bg-warning-500'
          }`}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* KPI completion chips */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {todayForm.kpis.map((kpi) => (
            <div
              key={kpi.kpi_id}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                kpi.has_entry_today
                  ? 'bg-success-500/10 text-success-400 border border-success-500/20'
                  : 'bg-dark-800 text-dark-300 border border-dark-600'
              }`}
            >
              {kpi.kpi_name}
              {kpi.has_entry_today && kpi.today_entry && (
                <span className="ml-2 font-medium">
                  {kpi.today_entry.calculated_value.toFixed(1)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {completionPercentage < 100 && (
        <Link
          to="/entries"
          className="mt-3 inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 flex-shrink-0"
        >
          Complete remaining entries
        </Link>
      )}
    </div>
  )
}
