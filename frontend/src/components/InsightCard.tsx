import {
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  InformationCircleIcon,
  SparklesIcon,
  CheckCircleIcon,
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

  const getPriorityStyles = () => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-danger-500/10',
          border: 'border-danger-500/20',
          iconColor: 'text-danger-400',
          badge: 'bg-danger-500/15 text-danger-400',
        }
      case 'medium':
        return {
          bg: 'bg-warning-500/10',
          border: 'border-warning-500/20',
          iconColor: 'text-warning-400',
          badge: 'bg-warning-500/15 text-warning-400',
        }
      default:
        return {
          bg: 'bg-primary-500/10',
          border: 'border-primary-500/20',
          iconColor: 'text-primary-400',
          badge: 'bg-primary-500/15 text-primary-400',
        }
    }
  }

  const styles = getPriorityStyles()
  const Icon = getTypeIcon()

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`} />
          <div className="flex-1 min-w-0">
            {displayTitle && (
              <p className="text-sm font-medium text-foreground mb-1">{displayTitle}</p>
            )}
            <p className="text-sm text-dark-200">{displayText}</p>
            {kpiName && (
              <p className="text-xs text-dark-400 mt-1">{kpiName}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-xl border ${styles.bg} ${styles.border}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.badge}`}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
            </span>
            {generatedAt && (
              <span className="text-xs text-dark-400">
                {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
              </span>
            )}
          </div>
          {displayTitle && (
            <p className="text-sm font-medium text-foreground mb-1">{displayTitle}</p>
          )}
          <p className="text-sm text-dark-200">{displayText}</p>
          {kpiName && (
            <p className="text-xs text-dark-400 mt-2 flex items-center gap-1">
              <InformationCircleIcon className="w-4 h-4" />
              Related to: {kpiName}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
