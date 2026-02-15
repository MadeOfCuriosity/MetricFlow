import { Link } from 'react-router-dom'
import { KPICard } from '../KPICard'
import type { DashboardData } from '../../hooks/useDashboardData'
import type { DateRange } from '../DateRangeSelector'

interface KPICardsWidgetProps {
  data: DashboardData
  selectedKPI: string | null
  setSelectedKPI: (id: string | null) => void
  dateRange: DateRange
}

export function KPICardsWidget({ data, selectedKPI, setSelectedKPI, dateRange }: KPICardsWidgetProps) {
  if (data.kpisWithEntries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-dark-400">No KPIs yet</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <Link to="/kpis" className="text-xs text-primary-400 hover:text-primary-300">
          Manage KPIs
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {data.kpisWithEntries.map((kpi) => {
            const rangeEntries = data.filterEntriesByRange(kpi.entries, dateRange)
            return (
              <KPICard
                key={kpi.id}
                kpiId={kpi.id}
                name={kpi.name}
                value={rangeEntries[0]?.calculated_value ?? null}
                previousValue={rangeEntries[1]?.calculated_value ?? null}
                category={kpi.category}
                roomPaths={kpi.room_paths}
                sparklineData={rangeEntries
                  .slice(0, 7)
                  .reverse()
                  .map((e) => ({ value: e.calculated_value }))}
                onClick={() => setSelectedKPI(kpi.id)}
                isSelected={selectedKPI === kpi.id}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
