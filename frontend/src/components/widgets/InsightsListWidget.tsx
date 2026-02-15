import { Link } from 'react-router-dom'
import { LightBulbIcon } from '@heroicons/react/24/outline'
import { InsightCard } from '../InsightCard'
import type { WidgetConfig, Insight } from '../../types/dashboard'
import type { DashboardData } from '../../hooks/useDashboardData'
import type { DateRange } from '../DateRangeSelector'

interface InsightsListWidgetProps {
  config: WidgetConfig
  data: DashboardData
  dateRange: DateRange
}

export function InsightsListWidget({ config, data, dateRange }: InsightsListWidgetProps) {
  const maxItems = config.maxItems || 5

  const filtered = data.insights.filter((i: Insight) => {
    if (!dateRange.startDate && !dateRange.endDate) return true
    const insightDate = i.generated_at.slice(0, 10)
    if (dateRange.startDate && insightDate < dateRange.startDate) return false
    if (dateRange.endDate && insightDate > dateRange.endDate) return false
    return true
  })

  const displayed = filtered.slice(0, maxItems)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <Link to="/insights" className="text-xs text-primary-400 hover:text-primary-300">
          View all
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {displayed.length === 0 ? (
          <div className="text-center py-6">
            <LightBulbIcon className="w-8 h-8 text-dark-500 mx-auto mb-2" />
            <p className="text-sm text-dark-400">
              {filtered.length === 0 && data.insights.length > 0
                ? 'No insights in this date range.'
                : 'No insights yet. Enter data to get AI-powered insights.'}
            </p>
          </div>
        ) : (
          displayed.map((insight) => (
            <InsightCard
              key={insight.id}
              id={insight.id}
              text={insight.insight_text}
              priority={insight.priority}
              kpiName={insight.kpi_name}
              generatedAt={insight.generated_at}
              compact
            />
          ))
        )}
      </div>
    </div>
  )
}
