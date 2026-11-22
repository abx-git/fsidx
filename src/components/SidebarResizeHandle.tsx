import { useCallback, useRef } from 'react'

interface SidebarResizeHandleProps {
  onResize: (widthPx: number) => void
  minWidth: number
  maxWidth: number
  getCurrentWidth: () => number
}

/** Ziehpunkt am linken Rand der Seitenleiste (Breite verändern). */
export function SidebarResizeHandle({
  onResize,
  minWidth,
  maxWidth,
  getCurrentWidth,
}: SidebarResizeHandleProps) {
  const dragging = useRef(false)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      dragging.current = true
      const startX = e.clientX
      const startWidth = getCurrentWidth()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return
        const delta = startX - ev.clientX
        onResize(startWidth + delta)
      }

      const onUp = (ev: PointerEvent) => {
        dragging.current = false
        target.releasePointerCapture(ev.pointerId)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [getCurrentWidth, maxWidth, minWidth, onResize],
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Seitenleiste breiter oder schmaler ziehen"
      title="Breite ziehen"
      onPointerDown={onPointerDown}
      className="absolute left-0 top-0 z-20 h-full w-2 -translate-x-1/2 cursor-col-resize touch-none bg-transparent hover:bg-emerald-500/20 active:bg-emerald-500/35"
    />
  )
}