import { Link } from 'react-router-dom'
import { ChartBarIcon, PlusIcon } from '@heroicons/react/24/outline'
import { TrendChart } from '../TrendChart'
import { getPresetLabel } from '../DateRangeSelector'
import type { WidgetConfig } from '../../types/dashboard'
import type { DashboardData } from '../../hooks/useDashboardData'
import type { DateRange, DateRangePreset } from '../DateRangeSelector'

interface LineChartWidgetProps {
  config: WidgetConfig
  data: DashboardData
  selectedKPI: string | null
  setSelectedKPI: (id: string | null) => void
  dateRange: DateRange
  activePreset: DateRangePreset
}

export function LineChartWidget({
  config,
  data,
  selectedKPI,
  dateRange,
  activePreset,
}: LineChartWidgetProps) {
  const kpiId = config.kpiId || selectedKPI
  const kpiData = kpiId ? data.getKPIById(kpiId) : undefined
  const filteredEntries = kpiData ? data.filterEntriesByRange(kpiData.entries, dateRange) : []
  const chartData = filteredEntries
    .slice()
    .reverse()
    .map((e) => ({ date: e.date, value: e.calculated_value }))

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <p className="text-sm font-medium text-foreground">
            {kpiData?.name || 'Select a KPI'}
          </p>
          <p className="text-xs text-dark-400">{getPresetLabel(activePreset)}</p>
        </div>
        {kpiData && (
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">
              {kpiData.currentValue?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}
            </p>
            <p className="text-xs text-dark-400">Current</p>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {chartData.length > 0 ? (
          <TrendChart data={chartData} kpiName={kpiData?.name || ''} height="100%" />
        ) : (
          <div className="flex items-center justify-center h-full bg-dark-800/30 rounded-lg">
            <div className="text-center">
              <ChartBarIcon className="w-10 h-10 text-dark-500 mx-auto mb-2" />
              <p className="text-sm text-dark-400">No data to display</p>
              <Link
                to="/entries"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
              >
                <PlusIcon className="w-3 h-3" />
                Add entry
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
