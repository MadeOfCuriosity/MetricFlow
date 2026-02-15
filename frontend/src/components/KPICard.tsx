import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon, EyeIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'

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
}

export function KPICard({
  kpiId,
  name,
  value,
  previousValue,
  category,
  sparklineData = [],
  onClick,
  isSelected = false,
  roomPaths,
}: KPICardProps) {
  const navigate = useNavigate()
  // Calculate trend
  const trend = value !== null && previousValue !== null && previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
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
      Sales: 'bg-primary-500/10 text-primary-400',
      Marketing: 'bg-purple-500/10 text-purple-400',
      Operations: 'bg-warning-500/10 text-warning-400',
      Finance: 'bg-success-500/10 text-success-400',
      Custom: 'bg-dark-600/30 text-dark-300',
    }
    return colors[cat] || colors.Custom
  }

  return (
    <div
      onClick={onClick}
      className={`bg-dark-900 border rounded-xl p-5 transition-all cursor-pointer shadow-card hover:shadow-card-hover hover:border-primary-500/50 ${
        isSelected ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-dark-700'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(category)}`}>
            {category}
          </span>
          <h3 className="mt-2 text-sm font-medium text-dark-300">{name}</h3>
          {roomPaths && roomPaths.length > 0 && (
            <p className="mt-0.5 text-xs text-dark-400 truncate max-w-[180px]" title={roomPaths.join(' | ')}>
              {roomPaths.join(' | ')}
            </p>
          )}
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
            {value !== null ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
          </p>
        </div>
        {trend !== null && (
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/kpis/${kpiId}/data`)
        }}
        className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-dark-300 hover:text-foreground bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
      >
        <EyeIcon className="w-4 h-4" />
        View Data
      </button>
    </div>
  )
}
