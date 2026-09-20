import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { getTagColor, hexToRgba } from '../constants/tagColors'
import { useTheme } from '../context/ThemeContext'

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

  // ONLY resolve color if roomColor is set!
  const tagColor = roomColor ? getTagColor(roomColor) : null
  const hasColor = !!tagColor

  const displayRoom =
    roomName ||
    (roomPaths && roomPaths.length > 0 ? roomPaths[0].split(' > ').pop() : null) ||
    category

  // Trend
  const trend =
    value !== null && previousValue !== null && previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : null

  const trendColor =
    trend === null
      ? isDark
        ? 'text-white/40'
        : 'text-dark-400'
      : trend > 0
      ? isDark
        ? 'text-emerald-400'
        : 'text-emerald-600'
      : isDark
      ? 'text-rose-400'
      : 'text-rose-600'

  const sparkColor = trend === null ? '#71717a' : trend > 0 ? '#10b981' : '#ef4444'

  const formattedValue =
    value !== null
      ? Math.abs(value) >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : Math.abs(value) >= 10_000
        ? `${(value / 1_000).toFixed(1)}k`
        : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : '—'

  return (
    <div
      onClick={onClick}
      className={`relative group overflow-hidden rounded-[24px] p-4 transition-all duration-300 cursor-pointer backdrop-blur-2xl border hover:-translate-y-0.5 flex flex-col justify-between ${
        isSelected
          ? isDark
            ? 'border-white/30'
            : 'border-dark-400'
          : isDark
          ? 'border-white/10 hover:border-white/20'
          : 'border-dark-700/80 hover:border-dark-400/60'
      }`}
      style={{
        background: hasColor && tagColor
          ? isDark
            ? `linear-gradient(145deg, ${hexToRgba(tagColor.hex, 0.15)} 0%, rgba(14,14,16,0.72) 60%)`
            : `linear-gradient(145deg, ${hexToRgba(tagColor.hex, 0.12)} 0%, rgba(255,255,255,0.85) 60%)`
          : isDark
          ? 'rgba(14, 14, 16, 0.72)'
          : 'rgba(255, 255, 255, 0.85)',
        boxShadow: isSelected
          ? isDark
            ? `0 10px 28px -6px rgba(0,0,0,0.65)${hasColor && tagColor ? `, 0 0 0 1px ${hexToRgba(tagColor.hex, 0.4)}` : ''}`
            : `0 4px 20px -2px rgba(0,0,0,0.08)${hasColor && tagColor ? `, 0 0 0 1.5px ${hexToRgba(tagColor.hex, 0.5)}` : ''}`
          : isDark
          ? '0 10px 28px -6px rgba(0,0,0,0.65)'
          : '0 4px 20px -2px rgba(0,0,0,0.05), 0 1px 3px 0 rgba(0,0,0,0.03)',
      }}
    >
      {/* Top rim highlight */}
      <div
        className={`absolute inset-x-0 top-0 h-[1px] pointer-events-none transition-opacity duration-300 ${
          isDark ? 'opacity-50 group-hover:opacity-80' : 'opacity-40 group-hover:opacity-85'
        }`}
        style={{
          background: hasColor && tagColor
            ? `linear-gradient(90deg, transparent 0%, ${tagColor.glassRim || tagColor.hex} 50%, transparent 100%)`
            : `linear-gradient(90deg, transparent 0%, ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)'} 50%, transparent 100%)`,
        }}
      />

      {/* Top row: room pill + sparkline */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-md text-[11px] font-medium truncate max-w-[65%] ${
            isDark
              ? 'bg-white/[0.06] border border-white/10 text-white/80'
              : 'bg-black/[0.04] border border-black/[0.08] text-dark-100 shadow-sm'
          }`}
        >
          {hasColor && tagColor ? (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: tagColor.hex, boxShadow: `0 0 6px ${tagColor.hex}` }}
            />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-dark-400/40" />
          )}
          <span className="truncate">{displayRoom}</span>
        </div>

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
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor} flex-shrink-0`}>
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
    </div>
  )
}
