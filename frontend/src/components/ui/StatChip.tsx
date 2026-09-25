import { ReactNode } from 'react'

interface StatChipProps {
  /** Leading icon or status dot */
  icon?: ReactNode
  label: ReactNode
  value: ReactNode
  /** Small trailing note, e.g. "(Top-level)" */
  hint?: ReactNode
}

/** Compact "Label: value" summary pill used above list pages */
export function StatChip({ icon, label, value, hint }: StatChipProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
      {icon}
      <span className="text-dark-400">{label}:</span>
      <span className="font-semibold text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-dark-400">{hint}</span>}
    </div>
  )
}
