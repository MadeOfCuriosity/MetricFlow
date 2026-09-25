import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { AggregatedKPI } from '../types/room'
import { getTagColor } from '../constants/tagColors'
import { trendColor } from '../lib/chartColors'
import { formatCompactNumber } from '../lib/format'
import { TagCard, TagPill } from './ui/Tag'

interface AggregatedKPICardProps {
  aggregatedKpi: AggregatedKPI
  onClick?: () => void
  isSelected?: boolean
  /** Tag color of the room this card is shown in */
  roomColor?: string | null
  roomName?: string | null
  /** Effective tag color per sub-room id, for the breakdown bar */
  subRoomColors?: Record<string, string | null>
}

// Untagged sub-rooms fall back to neutral greys so tagged ones stand out
const UNTAGGED_SHADES = ['rgb(var(--color-dark-300))', 'rgb(var(--color-dark-400))', 'rgb(var(--color-dark-500))', 'rgb(var(--color-dark-600))']

export function AggregatedKPICard({
  aggregatedKpi,
  onClick,
  isSelected = false,
  roomColor,
  roomName,
  subRoomColors = {},
}: AggregatedKPICardProps) {
  const { kpi, aggregation_method, current_aggregated_value, previous_aggregated_value, recent_entries, breakdown } = aggregatedKpi

  const trend =
    current_aggregated_value !== null &&
    previous_aggregated_value !== null &&
    previous_aggregated_value !== undefined &&
    previous_aggregated_value !== 0
      ? ((current_aggregated_value - previous_aggregated_value) / Math.abs(previous_aggregated_value)) * 100
      : null

  const trendTextColor =
    trend === null || trend === 0 ? 'text-dark-400' : trend > 0 ? 'text-success-400' : 'text-danger-400'

  const sparklineData = recent_entries
    .slice(0, 7)
    .reverse()
    .map((e) => ({ value: e.aggregated_value }))

  const breakdownTotal = breakdown.reduce((sum, b) => sum + b.value, 0)
  let untaggedIndex = 0
  const breakdownColors = breakdown.map((b) => {
    const tag = getTagColor(subRoomColors[b.room_id])
    return tag ? tag.hex : UNTAGGED_SHADES[untaggedIndex++ % UNTAGGED_SHADES.length]
  })

  return (
    <TagCard color={roomColor} isSelected={isSelected} onClick={onClick}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <TagPill color={roomColor} label={roomName || kpi.category} className="max-w-[60%]" />
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-dark-800/60 border border-dark-700 text-dark-300 flex-shrink-0">
            {aggregation_method}
          </span>
        </div>
        {sparklineData.length > 1 && (
          <div className="w-16 h-8 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line type="monotone" dataKey="value" stroke={trendColor(trend)} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="text-xs font-medium text-dark-400 truncate mb-1.5">{kpi.name}</p>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xl font-bold leading-none text-foreground">
            {current_aggregated_value !== null
              ? formatCompactNumber(current_aggregated_value, { maximumFractionDigits: 2 })
              : '—'}
          </p>
          <p className="text-[11px] text-dark-400 mt-1">
            from {breakdown.length} sub-room{breakdown.length !== 1 ? 's' : ''}
          </p>
        </div>
        {trend !== null && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trendTextColor} flex-shrink-0`}>
            {trend > 0 ? (
              <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            ) : trend < 0 ? (
              <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
            ) : (
              <MinusIcon className="w-3.5 h-3.5" />
            )}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Sub-room breakdown, colored by each sub-room's tag */}
      {breakdown.length > 0 && breakdownTotal > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-dark-800">
            {breakdown.map((b, i) => (
              <div
                key={b.room_id}
                style={{ width: `${(b.value / breakdownTotal) * 100}%`, backgroundColor: breakdownColors[i] }}
                title={`${b.room_name}: ${b.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {breakdown.map((b, i) => (
              <div key={b.room_id} className="flex items-center gap-1 text-[11px] text-dark-300">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: breakdownColors[i] }} />
                <span className="truncate max-w-[80px]" title={b.room_name}>{b.room_name}</span>
                <span className="text-dark-500">
                  {b.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </TagCard>
  )
}
