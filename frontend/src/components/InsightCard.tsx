import { formatDistanceToNow } from 'date-fns'

interface InsightCardProps {
  id?: string
  text?: string
  title?: string
  description?: string
  priority: 'high' | 'medium' | 'low'
  kpiName?: string | null
  generatedAt?: string
  compact?: boolean
}

export function InsightCard({
  text,
  title,
  description,
  priority,
  kpiName,
  generatedAt,
  compact = false,
}: InsightCardProps) {
  const displayText = text || description || ''
  const displayTitle = title

  const getPriorityBadge = () => {
    switch (priority) {
      case 'high':
        return {
          pill: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
          dot: 'bg-danger-400',
        }
      case 'medium':
        return {
          pill: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
          dot: 'bg-warning-400',
        }
      default:
        return {
          pill: 'bg-dark-800 text-dark-300 border-dark-700',
          dot: 'bg-dark-400',
        }
    }
  }

  const badge = getPriorityBadge()

  if (compact) {
    return (
      <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-700/80 hover:border-dark-600 transition-colors">
        <div className="flex items-start gap-2.5">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`} title={`${priority} priority`} />
          <div className="flex-1 min-w-0">
            {displayTitle && (
              <p className="text-sm font-semibold text-foreground mb-1">{displayTitle}</p>
            )}
            <p className="text-xs text-dark-300 leading-relaxed">{displayText}</p>
            {kpiName && (
              <p className="text-[11px] text-dark-400 mt-1 flex items-center gap-1 font-medium">
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
      <div>
        <div>
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
            <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-brand transition-colors">
              {displayTitle}
            </h3>
          )}
          <p className="text-sm text-dark-300 leading-relaxed">{displayText}</p>
          {kpiName && (
            <div className="mt-3.5 pt-3 border-t border-dark-800/80 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700/80 text-xs text-dark-300 font-medium">
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
