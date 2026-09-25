import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

const sizes = {
  /** Compact chart/range toggles (6m · 1y, 7d · 14d · 30d) */
  xs: 'px-2.5 py-1 text-[11px] font-semibold',
  /** Toolbar filters (Rooms, Insights) */
  sm: 'px-3 py-1 text-xs font-medium',
  /** Activity feed filters */
  md: 'px-3 py-1.5 text-xs font-semibold',
}

const surfaces = {
  raised: 'bg-dark-900 border-dark-700',
  inset: 'bg-dark-950 border-dark-800',
  subtle: 'bg-dark-950/50 border-dark-800',
}

export interface SegmentOption<T extends string | number> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: keyof typeof sizes
  surface?: keyof typeof surfaces
  /** Extra classes for the track (e.g. gap-1.5, overflow-x-auto) */
  className?: string
  'aria-label'?: string
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'sm',
  surface = 'raised',
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex items-center p-1 border rounded-xl', surfaces[surface], className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg transition-all cursor-pointer',
              sizes[size],
              selected ? 'bg-dark-800 text-foreground shadow-sm' : 'text-dark-400 hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
