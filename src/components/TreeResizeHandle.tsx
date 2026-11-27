import { useCallback, useRef } from 'react'
import { startPanelPointerResize } from '../lib/panel-pointer-resize'

interface TreeResizeHandleProps {
  onResize: (widthPx: number) => void
  onResizeCommit?: (widthPx: number) => void
  minWidth: number
  maxWidth: number
  getCurrentWidth: () => number
}

/** Ziehpunkt zwischen Ordnerbaum und Mitte (Breite nach rechts vergrößern). */
export function TreeResizeHandle({
  onResize,
  onResizeCommit,
  minWidth,
  maxWidth,
  getCurrentWidth,
}: TreeResizeHandleProps) {
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
        widthDelta: (startX, clientX) => clientX - startX,
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
      aria-label="Ordnerbaum: Breite mit der Maus ziehen"
      title="Baumbreite ziehen"
      onPointerDown={onPointerDown}
      className="group absolute inset-y-0 right-0 z-30 flex w-3 translate-x-1/2 cursor-col-resize touch-none select-none items-stretch justify-center"
    >
      <span className="w-px bg-zinc-200 transition-colors group-hover:bg-emerald-500/70 group-active:bg-emerald-600 dark:bg-zinc-700" />
    </div>
  )
}