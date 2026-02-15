import type { WidgetConfig } from '../../types/dashboard'
import { useDashboard } from '../../context/DashboardContext'
import { StatNumberWidget } from './StatNumberWidget'
import { LineChartWidget } from './LineChartWidget'
import { BarChartWidget } from './BarChartWidget'
import { AreaChartWidget } from './AreaChartWidget'
import { GaugeProgressWidget } from './GaugeProgressWidget'
import { InsightsListWidget } from './InsightsListWidget'
import { KPICardsWidget } from './KPICardsWidget'
import { TodayProgressWidget } from './TodayProgressWidget'

interface WidgetRendererProps {
  config: WidgetConfig
}

export function WidgetRenderer({ config }: WidgetRendererProps) {
  const { data, selectedKPI, setSelectedKPI, dateRange, activePreset } = useDashboard()

  // Count filtered insights for stat widget
  const filteredInsightsCount = data.insights.filter((i) => {
    if (!dateRange.startDate && !dateRange.endDate) return true
    const insightDate = i.generated_at.slice(0, 10)
    if (dateRange.startDate && insightDate < dateRange.startDate) return false
    if (dateRange.endDate && insightDate > dateRange.endDate) return false
    return true
  }).length

  switch (config.type) {
    case 'stat-number':
      return (
        <StatNumberWidget
          config={config}
          data={data}
          filteredInsightsCount={filteredInsightsCount}
        />
      )
    case 'line-chart':
      return (
        <LineChartWidget
          config={config}
          data={data}
          selectedKPI={selectedKPI}
          setSelectedKPI={setSelectedKPI}
          dateRange={dateRange}
          activePreset={activePreset}
        />
      )
    case 'bar-chart':
      return (
        <BarChartWidget
          config={config}
          data={data}
          selectedKPI={selectedKPI}
          dateRange={dateRange}
        />
      )
    case 'area-chart':
      return (
        <AreaChartWidget
          config={config}
          data={data}
          selectedKPI={selectedKPI}
          dateRange={dateRange}
        />
      )
    case 'gauge-progress':
      return <GaugeProgressWidget data={data} />
    case 'insights-list':
      return (
        <InsightsListWidget
          config={config}
          data={data}
          dateRange={dateRange}
        />
      )
    case 'kpi-cards':
      return (
        <KPICardsWidget
          data={data}
          selectedKPI={selectedKPI}
          setSelectedKPI={setSelectedKPI}
          dateRange={dateRange}
        />
      )
    case 'today-progress':
      return <TodayProgressWidget data={data} />
    default:
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-dark-400">Unknown widget type</p>
        </div>
      )
  }
}
