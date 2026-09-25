import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { TagCard, TagPill } from './ui/Tag'
import { useTheme } from '../context/ThemeContext'
import { formatCompactNumber } from '../lib/format'
import { trendColor } from '../lib/chartColors'

interface KPICardProps {
  kpiId: string
  name: string
  value: number | null
  previousValue?: number | null
  category: string
  sparklineData?: { value: number }[]
  onClick?: () => void
  isSelected?: boolean
  roomPaths?: string[]
  roomColor?: string | null
  roomName?: string | null
}

export function KPICard({
  name,
  value,
  previousValue,
  category,
  sparklineData = [],
  onClick,
  isSelected = false,
  roomPaths,
  roomColor,
  roomName,
}: KPICardProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const displayRoom =
    roomName ||
    (roomPaths && roomPaths.length > 0 ? roomPaths[0].split(' > ').pop() : null) ||
    category

  // Trend
  const trend =
    value !== null && previousValue !== null && previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : null

  const trendTextColor =
    trend === null
      ? isDark
        ? 'text-white/40'
        : 'text-dark-400'
      : trend > 0
      ? isDark
        ? 'text-success-400'
        : 'text-success-600'
      : isDark
      ? 'text-danger-400'
      : 'text-danger-600'

  const sparkColor = trendColor(trend)

  const formattedValue = value !== null ? formatCompactNumber(value, { maximumFractionDigits: 2 }) : '—'

  return (
    <TagCard color={roomColor} isSelected={isSelected} onClick={onClick}>
      {/* Top row: room pill + sparkline */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <TagPill color={roomColor} label={displayRoom} className="max-w-[65%]" />

        {sparklineData.length > 1 && (
          <div className="w-16 h-8 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line type="monotone" dataKey="value" stroke={sparkColor} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* KPI name */}
      <p
        className={`text-xs font-medium truncate mb-1.5 ${
          isDark ? 'text-white/50' : 'text-dark-400'
        }`}
      >
        {name}
      </p>

      {/* Hero value + trend */}
      <div className="flex items-end justify-between gap-2">
        <p
          className={`text-xl font-bold leading-none ${
            isDark ? 'text-white' : 'text-foreground'
          }`}
        >
          {formattedValue}
        </p>
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
    </TagCard>
  )
}
