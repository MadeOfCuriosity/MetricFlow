import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { format } from 'date-fns'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import type { WidgetConfig } from '../../types/dashboard'
import type { DashboardData } from '../../hooks/useDashboardData'
import type { DateRange } from '../DateRangeSelector'
import { CHART_COLORS } from '../../lib/chartColors'

interface SeriesChartWidgetProps {
  variant: 'bar' | 'area'
  config: WidgetConfig
  data: DashboardData
  selectedKPI: string | null
  dateRange: DateRange
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-lg">
      <p className="text-xs text-dark-300 mb-1">
        {format(new Date(label), 'MMM d, yyyy')}
      </p>
      <p className="text-lg font-semibold text-foreground">
        {payload[0].value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

/** Bar or area chart of one KPI over the selected date range (dashboard widget). */
export function SeriesChartWidget({ variant, config, data, selectedKPI, dateRange }: SeriesChartWidgetProps) {
  const kpiId = config.kpiId || selectedKPI
  const kpiData = kpiId ? data.getKPIById(kpiId) : undefined
  const filteredEntries = kpiData ? data.filterEntriesByRange(kpiData.entries, dateRange) : []
  const chartData = filteredEntries
    .slice()
    .reverse()
    .map((e) => ({ date: e.date, value: e.calculated_value }))

  const isPositive = chartData.length >= 2 && chartData[chartData.length - 1].value >= chartData[0].value
  const color = isPositive ? CHART_COLORS.up : CHART_COLORS.down
  const gradientId = `area-gradient-${config.id}`

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-800/30 rounded-lg">
        <div className="text-center">
          <ChartBarIcon className="w-10 h-10 text-dark-500 mx-auto mb-2" />
          <p className="text-sm text-dark-400">No data available</p>
        </div>
      </div>
    )
  }

  // Grid, axes and tooltip shared by both variants (recharts accepts an array of children)
  const axes = [
    <CartesianGrid key="grid" strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />,
    <XAxis
      key="x"
      dataKey="date"
      tickFormatter={(date) => format(new Date(date), 'MMM d')}
      stroke={CHART_COLORS.axis}
      fontSize={12}
      tickLine={false}
      axisLine={false}
    />,
    <YAxis
      key="y"
      stroke={CHART_COLORS.axis}
      fontSize={12}
      tickLine={false}
      axisLine={false}
      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString())}
    />,
    <Tooltip key="tooltip" content={<CustomTooltip />} />,
  ]

  return (
    <div className="h-full flex flex-col">
      {kpiData && (
        <p className="text-sm font-medium text-foreground mb-2 flex-shrink-0">{kpiData.name}</p>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {variant === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              {axes}
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              {axes}
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 5, fill: color, stroke: CHART_COLORS.dotRing, strokeWidth: 2 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
