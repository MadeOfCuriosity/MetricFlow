import { useState, useRef, useEffect, useLayoutEffect, ReactNode, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { TagColorPalette } from './TagColorPalette'
import { TagDot } from './ui/Tag'
import { useDismiss } from '../hooks/useDismiss'

interface TagColorPickerPopoverProps {
  selectedColor?: string | null
  onSelectColor: (color: string | null) => void
  align?: 'left' | 'right' | 'center'
  children?: (props: { isOpen: boolean; toggle: (e: React.MouseEvent) => void }) => ReactNode
}

const POPOVER_WIDTH = 316 // 9 swatches (28px) + gaps + padding
const VIEWPORT_MARGIN = 12

export function TagColorPickerPopover({
  selectedColor = null,
  onSelectColor,
  align = 'left',
  children,
}: TagColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // The popover is portaled to <body> so hover-only toolbars, clickable cards and
  // transformed/clipped parents can't hide it or swallow drags inside it.
  const reposition = useCallback(() => {
    const anchor = containerRef.current?.getBoundingClientRect()
    if (!anchor) return
    const height = popoverRef.current?.offsetHeight ?? 0
    let left =
      align === 'right'
        ? anchor.right - POPOVER_WIDTH
        : align === 'center'
          ? anchor.left + anchor.width / 2 - POPOVER_WIDTH / 2
          : anchor.left
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN)
    let top = anchor.bottom + 8
    if (height && top + height > window.innerHeight - VIEWPORT_MARGIN && anchor.top - 8 - height > VIEWPORT_MARGIN) {
      top = anchor.top - 8 - height
    }
    setPosition({ top, left })
  }, [align])

  useLayoutEffect(() => {
    if (!isOpen) return
    reposition()
    // Re-anchor when the content grows (e.g. the custom picker expands)
    const el = popoverRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => reposition())
    ro.observe(el)
    return () => ro.disconnect()
  }, [isOpen, reposition])

  useDismiss([containerRef, popoverRef], () => setIsOpen(false), { enabled: isOpen, escape: true })

  useEffect(() => {
    if (!isOpen) {
      setPosition(null)
      return
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [isOpen, reposition])

  const handlePick = (colorId: string | null, e?: React.SyntheticEvent) => {
    e?.stopPropagation()
    if (colorId !== selectedColor) onSelectColor(colorId)
    setIsOpen(false)
  }


  // React events bubble through portals to the trigger's ancestors (e.g. a room card's
  // onClick that navigates), so stop them at the popover boundary.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div className="relative inline-block" ref={containerRef}>
      {children ? (
        children({
          isOpen,
          toggle: (e: React.MouseEvent) => {
            e.stopPropagation()
            setIsOpen((prev) => !prev)
          },
        })
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen((prev) => !prev)
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-dark-200 hover:text-foreground bg-dark-800/80 hover:bg-dark-750 border border-dark-700/80 rounded-lg transition-colors cursor-pointer"
          title="Set room tag color"
        >
          <TagDot color={selectedColor} size="md" empty="ring" />
          <span>Tag Color</span>
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={stop}
            onMouseDown={stop}
            onPointerDown={stop}
            onDoubleClick={stop}
            style={{
              position: 'fixed',
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width: POPOVER_WIDTH,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="z-[100] rounded-2xl bg-dark-900/95 border border-dark-700 p-3.5 shadow-2xl backdrop-blur-xl select-none"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-dark-300">Tag color</span>
              {selectedColor && (
                <button
                  type="button"
                  onClick={(e) => handlePick(null, e)}
                  className="text-[11px] text-dark-400 hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                >
                  <XMarkIcon className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <TagColorPalette value={selectedColor} onChange={(c) => handlePick(c)} />
          </div>,
          document.body
        )}
    </div>
  )
}
