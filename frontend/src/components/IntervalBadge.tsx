const INTERVAL_BADGE: Record<string, string> = {
  weekly: 'bg-dark-800 text-dark-300 border-dark-700',
  monthly: 'bg-dark-800 text-dark-300 border-dark-700',
  custom: 'bg-dark-800 text-dark-300 border-dark-700',
  daily: 'bg-dark-800 text-dark-300 border-dark-700',
}

// Display names (the stored value stays 'custom')
export const INTERVAL_LABELS: Record<string, string> = {
  daily: 'bg-dark-800 text-dark-300 border-dark-700',
  weekly: 'bg-dark-800 text-dark-300 border-dark-700',
  monthly: 'bg-dark-800 text-dark-300 border-dark-700',
  custom: 'bg-dark-800 text-dark-300 border-dark-700',
}

/** Colored pill for a data field's entry interval (daily / weekly / monthly / no schedule). */
export function IntervalBadge({ interval }: { interval: string | null | undefined }) {
  const value = interval || 'daily'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${
        INTERVAL_BADGE[value] || INTERVAL_BADGE.daily
      }`}
    >
      {INTERVAL_LABELS[value] ?? value}
    </span>
  )
}
