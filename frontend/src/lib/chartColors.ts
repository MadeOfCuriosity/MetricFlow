/**
 * The one set of colors for charts, sparklines and gauges.
 * Values read the CSS variables in styles/theme.css, so they follow light/dark.
 */
export const CHART_COLORS = {
  /** Brand accent (#cf603e): neutral series, highlights, "in progress" */
  brand: 'rgb(var(--color-brand))',
  /** Positive trend / complete */
  up: 'rgb(var(--color-success-500))',
  /** Negative trend */
  down: 'rgb(var(--color-danger-500))',
  /** No change / no data */
  flat: 'rgb(var(--color-dark-500))',
  /** Warning / low progress */
  warning: 'rgb(var(--color-warning-500))',
  grid: 'rgb(var(--color-dark-700))',
  axis: 'rgb(var(--color-dark-400))',
  track: 'rgb(var(--color-dark-700))',
  /** Ring around active dots, matches the card surface */
  dotRing: 'rgb(var(--color-dark-800))',
} as const

/** Line color for a series or sparkline given its trend (% change or null). */
export function trendColor(trend: number | null): string {
  if (trend === null || trend === 0) return CHART_COLORS.flat
  return trend > 0 ? CHART_COLORS.up : CHART_COLORS.down
}
