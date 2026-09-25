import { useEffect, useRef, RefObject } from 'react'

interface UseDismissOptions {
  /** Only listen while true (e.g. while a popover is open). Default: true */
  enabled?: boolean
  /** Also dismiss on the Escape key. Default: false */
  escape?: boolean
}

/**
 * Calls `onDismiss` on a mousedown outside every element in `refs`
 * (and optionally on Escape). Shared by popovers, dropdowns and menus.
 */
export function useDismiss(
  refs: RefObject<HTMLElement | null>[],
  onDismiss: () => void,
  { enabled = true, escape = false }: UseDismissOptions = {}
) {
  // Keep the latest callback/refs without re-subscribing on every render
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss
  const refsRef = useRef(refs)
  refsRef.current = refs

  useEffect(() => {
    if (!enabled) return

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node
      if (refsRef.current.some((ref) => ref.current?.contains(target))) return
      onDismissRef.current()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismissRef.current()
    }

    document.addEventListener('mousedown', handleMouseDown)
    if (escape) document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      if (escape) document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, escape])
}
