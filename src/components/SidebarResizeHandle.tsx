import { useCallback, useRef } from 'react'

interface SidebarResizeHandleProps {
  onResize: (widthPx: number) => void
  /** Fires once when the drag ends (defaults to final onResize). */
  onResizeCommit?: (widthPx: number) => void
  minWidth: number
  maxWidth: number
  getCurrentWidth: () => number
}

function clampWidth(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Ziehpunkt an der Trennlinie Mitte ↔ Detail (Breite stufenlos). */
export function SidebarResizeHandle({
  onResize,
  onResizeCommit,
  minWidth,
  maxWidth,
  getCurrentWidth,
}: SidebarResizeHandleProps) {
  const dragging = useRef(false)
  const lastWidth = useRef(0)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      dragging.current = true
      const startX = e.clientX
      const startWidth = getCurrentWidth()
      lastWidth.current = startWidth
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return
        const delta = startX - ev.clientX
        const next = clampWidth(startWidth + delta, minWidth, maxWidth)
        lastWidth.current = next
        onResize(next)
      }

      const onUp = (ev: PointerEvent) => {
        dragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        target.releasePointerCapture(ev.pointerId)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        const commit = onResizeCommit ?? onResize
        commit(lastWidth.current)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [getCurrentWidth, maxWidth, minWidth, onResize, onResizeCommit],
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={getCurrentWidth()}
      aria-label="Detailbereich: Breite mit der Maus ziehen"
      title="Detailbreite ziehen"
      onPointerDown={onPointerDown}
      className="group absolute inset-y-0 left-0 z-30 flex w-3 -translate-x-1/2 cursor-col-resize touch-none select-none items-stretch justify-center"
    >
      <span className="w-px bg-zinc-200 transition-colors group-hover:bg-emerald-500/70 group-active:bg-emerald-600 dark:bg-zinc-700" />
    </div>
  )
}