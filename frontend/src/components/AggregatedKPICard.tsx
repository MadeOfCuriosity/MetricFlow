import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { AggregatedKPI } from '../types/room'

interface AggregatedKPICardProps {
  aggregatedKpi: AggregatedKPI
  onClick?: () => void
  isSelected?: boolean
}

export function AggregatedKPICard({
  aggregatedKpi,
  onClick,
  isSelected = false,
}: AggregatedKPICardProps) {
  const { kpi, aggregation_method, current_aggregated_value, previous_aggregated_value, recent_entries, breakdown } = aggregatedKpi

  // Calculate trend
  const trend =
    current_aggregated_value !== null &&
    previous_aggregated_value !== null &&
    previous_aggregated_value !== undefined &&
    previous_aggregated_value !== 0
      ? ((current_aggregated_value - previous_aggregated_value) / Math.abs(previous_aggregated_value)) * 100
      : null

  const getTrendIcon = () => {
    if (trend === null) return <MinusIcon className="w-4 h-4 text-dark-400" />
    if (trend > 0) return <ArrowTrendingUpIcon className="w-4 h-4 text-success-400" />
    if (trend < 0) return <ArrowTrendingDownIcon className="w-4 h-4 text-danger-400" />
    return <MinusIcon className="w-4 h-4 text-dark-400" />
  }

  const getTrendColor = () => {
    if (trend === null) return 'text-dark-400'
    if (trend > 0) return 'text-success-400'
    if (trend < 0) return 'text-danger-400'
    return 'text-dark-400'
  }

  const getSparklineColor = () => {
    if (trend === null) return '#52525b'
    if (trend > 0) return '#4ade80'
    if (trend < 0) return '#f87171'
    return '#52525b'
  }

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      Sales: 'bg-dark-800 text-foreground border border-dark-700',
      Marketing: 'bg-dark-800 text-foreground border border-dark-700',
      Operations: 'bg-warning-500/15 text-warning-400',
      Finance: 'bg-success-500/15 text-success-400',
      Custom: 'bg-dark-800 text-dark-300 border border-dark-700',
    }
    return colors[cat] || colors.Custom
  }

  const sparklineData = recent_entries
    .slice(0, 7)
    .reverse()
    .map((e) => ({ value: e.aggregated_value }))

  // Calculate total for breakdown percentages
  const breakdownTotal = breakdown.reduce((sum, b) => sum + b.value, 0)

  return (
    <div
      onClick={onClick}
      className={`bg-dark-900 border rounded-xl p-5 transition-all cursor-pointer shadow-card hover:shadow-card-hover hover:border-foreground/40 ${
        isSelected ? 'border-foreground ring-1 ring-foreground/20' : 'border-dark-700'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(kpi.category)}`}>
              {kpi.category}
            </span>
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-dark-800 text-dark-300 border border-dark-700">
              {aggregation_method.toUpperCase()}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-medium text-dark-300">{kpi.name}</h3>
        </div>
        {sparklineData.length > 1 && (
          <div className="w-20 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getSparklineColor()}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">
            {current_aggregated_value !== null
              ? current_aggregated_value.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : '—'}
          </p>
          <p className="text-xs text-dark-400 mt-0.5">
            from {breakdown.length} sub-room{breakdown.length !== 1 ? 's' : ''}
          </p>
        </div>
        {trend !== null && (
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Sub-room breakdown */}
      {breakdown.length > 0 && breakdownTotal > 0 && (
        <div className="mt-4 space-y-2">
          {/* Stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-dark-800">
            {breakdown.map((b, i) => {
              const pct = (b.value / breakdownTotal) * 100
              const barColors = [
                'bg-foreground',
                'bg-dark-400',
                'bg-success-500',
                'bg-warning-500',
                'bg-dark-500',
                'bg-dark-300',
              ]
              return (
                <div
                  key={b.room_id}
                  className={`${barColors[i % barColors.length]}`}
                  style={{ width: `${pct}%` }}
                  title={`${b.room_name}: ${b.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                />
              )
            })}
          </div>
          {/* Labels */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {breakdown.map((b, i) => {
              const dotColors = [
                'bg-foreground',
                'bg-dark-400',
                'bg-success-500',
                'bg-warning-500',
                'bg-dark-500',
                'bg-dark-300',
              ]
              return (
                <div key={b.room_id} className="flex items-center gap-1 text-xs text-dark-300">
                  <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                  <span className="truncate max-w-[80px]" title={b.room_name}>{b.room_name}</span>
                  <span className="text-dark-500">
                    {b.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
