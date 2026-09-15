import {
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  SparklesIcon,
  CheckCircleIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface InsightCardProps {
  id?: string
  text?: string
  title?: string
  description?: string
  type?: 'trend' | 'anomaly' | 'milestone' | 'recommendation'
  priority: 'high' | 'medium' | 'low'
  kpiName?: string | null
  generatedAt?: string
  compact?: boolean
}

export function InsightCard({
  text,
  title,
  description,
  type,
  priority,
  kpiName,
  generatedAt,
  compact = false,
}: InsightCardProps) {
  const displayText = text || description || ''
  const displayTitle = title

  const getTypeIcon = () => {
    switch (type) {
      case 'trend':
        return ArrowTrendingUpIcon
      case 'anomaly':
        return ExclamationTriangleIcon
      case 'milestone':
        return CheckCircleIcon
      case 'recommendation':
        return SparklesIcon
      default:
        return LightBulbIcon
    }
  }

  const getPriorityBadge = () => {
    switch (priority) {
      case 'high':
        return {
          pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dot: 'bg-rose-400',
          iconColor: 'text-rose-400',
        }
      case 'medium':
        return {
          pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-400',
          iconColor: 'text-amber-400',
        }
      default:
        return {
          pill: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          dot: 'bg-primary-400',
          iconColor: 'text-primary-400',
        }
    }
  }

  const badge = getPriorityBadge()
  const Icon = getTypeIcon()

  if (compact) {
    return (
      <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-700/80 hover:border-dark-600 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center flex-shrink-0">
            <Icon className={`w-4 h-4 ${badge.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            {displayTitle && (
              <p className="text-sm font-semibold text-foreground mb-1">{displayTitle}</p>
            )}
            <p className="text-xs text-dark-300 leading-relaxed">{displayText}</p>
            {kpiName && (
              <p className="text-[11px] text-dark-400 mt-1 flex items-center gap-1 font-medium">
                <TagIcon className="w-3 h-3 text-dark-400" />
                {kpiName}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-dark-900 border border-dark-700 hover:border-dark-600/90 rounded-2xl p-5 transition-all duration-150 group shadow-xs">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <Icon className={`w-5 h-5 ${badge.iconColor} stroke-[1.8]`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${badge.pill}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <span className="capitalize">{priority} Priority</span>
            </span>
            {generatedAt && (
              <span className="text-[11px] text-dark-400">
                {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
              </span>
            )}
          </div>
          {displayTitle && (
            <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary-400 transition-colors">
              {displayTitle}
            </h3>
          )}
          <p className="text-sm text-dark-300 leading-relaxed">{displayText}</p>
          {kpiName && (
            <div className="mt-3.5 pt-3 border-t border-dark-800/80 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700/80 text-xs text-dark-300 font-medium">
                <TagIcon className="w-3.5 h-3.5 text-dark-400" />
                <span>KPI:</span>
                <span className="text-foreground font-semibold">{kpiName}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
