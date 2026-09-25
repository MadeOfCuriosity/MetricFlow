import { cn } from '../../lib/utils'

interface MaskIconProps {
  /** Path to an SVG in /public, e.g. "/icons/search.svg" */
  src: string
  className?: string
}

/** Renders an SVG file as a CSS mask so it takes the current text color (and theme). */
export function MaskIcon({ src, className }: MaskIconProps) {
  const mask = `url(${src}) center / contain no-repeat`
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block bg-current', className)}
      style={{ WebkitMask: mask, mask }}
    />
  )
}
