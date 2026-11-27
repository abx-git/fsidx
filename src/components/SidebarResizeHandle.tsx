import { useCallback, useRef } from 'react'
import { startPanelPointerResize } from '../lib/panel-pointer-resize'

interface SidebarResizeHandleProps {
  onResize: (widthPx: number) => void
  /** Fires once when the drag ends (defaults to final onResize). */
  onResizeCommit?: (widthPx: number) => void
  minWidth: number
  maxWidth: number
  getCurrentWidth: () => number
}

/** Ziehpunkt an der Trennlinie Mitte ↔ Detail (Breite stufenlos). */
export function SidebarResizeHandle({
  onResize,
  onResizeCommit,
  minWidth,
  maxWidth,
  getCurrentWidth,
}: SidebarResizeHandleProps) {
  const sessionRef = useRef<{ abort: () => void } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      sessionRef.current?.abort()
      const target = e.currentTarget as HTMLElement
      sessionRef.current = startPanelPointerResize({
        pointerId: e.pointerId,
        target,
        startX: e.clientX,
        startWidth: getCurrentWidth(),
        minWidth,
        maxWidth,
        widthDelta: (startX, clientX) => startX - clientX,
        onResize,
        onCommit: onResizeCommit ?? onResize,
      })
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