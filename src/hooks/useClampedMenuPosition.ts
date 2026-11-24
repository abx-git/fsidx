import { useLayoutEffect, useState, type RefObject } from 'react'
import { fitContextMenuToViewport } from '../lib/context-menu-position'

export function useClampedMenuPosition(
  menuRef: RefObject<HTMLElement | null>,
  anchor: { x: number; y: number } | null,
  deps: unknown[] = [],
): { left: number; top: number } | null {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(
    anchor ? { left: anchor.x, top: anchor.y } : null,
  )

  useLayoutEffect(() => {
    if (!anchor) {
      setPos(null)
      return
    }
    const el = menuRef.current
    if (!el) {
      setPos({ left: anchor.x, top: anchor.y })
      return
    }
    const { width, height } = el.getBoundingClientRect()
    setPos(fitContextMenuToViewport(anchor.x, anchor.y, width, height))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps signal menu content changes
  }, [anchor?.x, anchor?.y, menuRef, ...deps])

  return pos
}