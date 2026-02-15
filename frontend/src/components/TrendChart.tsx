import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { format } from 'date-fns'

interface DataPoint {
  date: string
  value: number
}

interface TrendChartProps {
  data: DataPoint[]
  kpiName: string
  height?: number
  showGrid?: boolean
}

// Custom tooltip component
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

export function TrendChart({
  data,
  kpiName,
  height = 300,
  showGrid = true,
}: TrendChartProps) {
  // Calculate if trend is positive or negative
  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value
  const lineColor = isPositive ? '#4ade80' : '#f87171'
  const gradientId = `gradient-${kpiName.replace(/\s+/g, '-')}`

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-dark-900/50 rounded-lg border border-dark-700"
        style={{ height }}
      >
        <p className="text-dark-400">No data available</p>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2a2a2e"
              vertical={false}
            />
          )}
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'MMM d')}
            stroke="#52525b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#52525b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 6,
              fill: lineColor,
              stroke: '#1f1f23',
              strokeWidth: 2,
            }}
            fill={`url(#${gradientId})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
