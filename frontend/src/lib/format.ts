/**
 * Compact number: 1.2M / 12.5k for large values, otherwise a localized number.
 * `smallOptions` controls how values below 10,000 are shown.
 */
export function formatCompactNumber(value: number, smallOptions?: Intl.NumberFormatOptions): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toLocaleString(undefined, smallOptions)
}

interface TimeAgoOptions {
  /** Text for < 1 minute. Default: "just now" */
  justNow?: string
  /** Say "yesterday" instead of "1d ago". Default: true */
  yesterday?: boolean
  /** From this many days on, show a short date ("Sep 5") instead. Default: never */
  dateAfterDays?: number
  now?: Date
}

/** "just now" · "5m ago" · "3h ago" · "yesterday" · "4d ago" · "Sep 5" */
export function formatTimeAgo(
  date: Date | string,
  { justNow = 'just now', yesterday = true, dateAfterDays = Infinity, now = new Date() }: TimeAgoOptions = {}
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1) return justNow
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays >= dateAfterDays) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (yesterday && diffDays === 1) return 'yesterday'
  return `${diffDays}d ago`
}
