import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { cn } from '../../lib/utils'

const variants = {
  /** App pages (Rooms, KPIs, Data, Users…) */
  default: {
    icon: 'left-3.5 h-4 w-4',
    input:
      'pl-9 pr-4 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors',
  },
  /** Super-admin console */
  admin: {
    icon: 'left-3 h-4 w-4',
    input:
      'pl-10 pr-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-brand',
  },
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  variant?: keyof typeof variants
  /** Classes for the wrapper (defaults to a flexible, max-w-md field) */
  className?: string
  autoFocus?: boolean
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  variant = 'default',
  className = 'flex-1 max-w-md',
  autoFocus,
}: SearchInputProps) {
  const v = variants[variant]
  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlassIcon className={cn('absolute top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none', v.icon)} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className={cn('w-full', v.input)}
      />
    </div>
  )
}
