import { cn } from '../../lib/utils'

const sizes = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
}

const tones = {
  /** Page / section loading */
  primary: 'border-t-2 border-b-2 border-brand',
  /** Inside a colored button */
  white: 'border-t-2 border-b-2 border-white',
}

interface SpinnerProps {
  size?: keyof typeof sizes
  tone?: keyof typeof tones
  className?: string
}

export function Spinner({ size = 'sm', tone = 'primary', className }: SpinnerProps) {
  return <div role="status" aria-label="Loading" className={cn('animate-spin rounded-full', sizes[size], tones[tone], className)} />
}
