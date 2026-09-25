import type { CSSProperties, ReactNode } from 'react'
import { FolderIcon, FolderOpenIcon } from '@heroicons/react/24/outline'
import { getTagColor, hexToRgba } from '../../constants/tagColors'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../lib/utils'

/*
 * The one way a room tag color is shown anywhere in the app.
 * Rooms, KPIs (which inherit their room's tag) and entries all go through these.
 */

const DOT_SIZES = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-4 h-4' } as const

interface TagDotProps {
  /** Preset tag id, custom hex, or null */
  color?: string | null
  size?: keyof typeof DOT_SIZES
  /** What to render when there is no tag: a dashed "add tag" ring, a muted dot, or nothing */
  empty?: 'ring' | 'muted' | 'none'
  className?: string
}

export function TagDot({ color, size = 'sm', empty = 'muted', className }: TagDotProps) {
  const tag = getTagColor(color)
  if (tag) {
    return (
      <span
        className={cn('rounded-full flex-shrink-0', DOT_SIZES[size], className)}
        style={{ backgroundColor: tag.hex, boxShadow: `0 0 6px ${hexToRgba(tag.hex, 0.6)}` }}
        title={`${tag.name} tag`}
      />
    )
  }
  if (empty === 'none') return null
  if (empty === 'ring') {
    return <span className={cn('rounded-full flex-shrink-0 border border-dashed border-dark-500', DOT_SIZES[size], className)} />
  }
  return <span className={cn('rounded-full flex-shrink-0 bg-dark-400/40', DOT_SIZES[size], className)} />
}

/** Folder glyph for a room row, tinted with the room's tag color. */
export function TagFolderIcon({ color, open = false, className }: { color?: string | null; open?: boolean; className?: string }) {
  const tag = getTagColor(color)
  const Glyph = open ? FolderOpenIcon : FolderIcon
  return <Glyph className={cn('h-4 w-4 flex-shrink-0', !tag && 'text-dark-300', className)} style={tag ? { color: tag.hex } : undefined} />
}

interface TagCardProps {
  color?: string | null
  isSelected?: boolean
  onClick?: () => void
  className?: string
  children: ReactNode
}

/** Frosted card surface tinted by a tag color. Used by every KPI card. */
export function TagCard({ color, isSelected = false, onClick, className, children }: TagCardProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const tag = getTagColor(color)

  const base = isDark ? 'rgba(14, 14, 16, 0.72)' : 'rgba(255, 255, 255, 0.85)'
  const shadow = isDark
    ? '0 10px 28px -6px rgba(0,0,0,0.65)'
    : '0 4px 20px -2px rgba(0,0,0,0.05), 0 1px 3px 0 rgba(0,0,0,0.03)'
  const ring = isSelected
    ? `, 0 0 0 1.5px ${tag ? hexToRgba(tag.hex, 0.6) : 'rgb(var(--color-brand) / 0.6)'}`
    : ''

  const style: CSSProperties = {
    background: tag ? `linear-gradient(145deg, ${hexToRgba(tag.hex, isDark ? 0.15 : 0.12)} 0%, ${base} 60%)` : base,
    boxShadow: shadow + ring,
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group overflow-hidden rounded-[24px] p-4 sm:p-5 transition-all duration-300 backdrop-blur-2xl border hover:-translate-y-0.5 flex flex-col justify-between',
        onClick && 'cursor-pointer',
        isDark ? 'border-white/10 hover:border-white/20' : 'border-dark-700/80 hover:border-dark-400/60',
        className
      )}
      style={style}
    >
      {/* Top rim highlight */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[1px] pointer-events-none transition-opacity duration-300',
          isDark ? 'opacity-50 group-hover:opacity-80' : 'opacity-40 group-hover:opacity-85'
        )}
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${
            tag ? tag.glassRim : isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)'
          } 50%, transparent 100%)`,
        }}
      />
      {children}
    </div>
  )
}

/** Pill showing which room (and tag) a KPI belongs to. */
export function TagPill({ color, label, className }: { color?: string | null; label: ReactNode; className?: string }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-md text-[11px] font-medium truncate min-w-0',
        isDark ? 'bg-white/[0.06] border border-white/10 text-white/80' : 'bg-black/[0.04] border border-black/[0.08] text-dark-100',
        className
      )}
    >
      <TagDot color={color} size={color ? 'sm' : 'xs'} />
      <span className="truncate">{label}</span>
    </span>
  )
}
