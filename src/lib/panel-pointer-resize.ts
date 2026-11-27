function clampWidth(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export type PanelPointerResizeSession = {
  abort: () => void
}

let activeAbort: (() => void) | null = null

function clearActiveAbort() {
  activeAbort = null
}

if (typeof window !== 'undefined') {
  window.addEventListener('blur', () => {
    activeAbort?.()
    clearActiveAbort()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    activeAbort?.()
    clearActiveAbort()
  })
}

/** Horizontales Ziehen einer Seitenleiste; bricht bei Tab-Wechsel ab (ohne Commit). */
export function startPanelPointerResize(options: {
  pointerId: number
  target: HTMLElement
  startX: number
  startWidth: number
  minWidth: number
  maxWidth: number
  /** Sidebar: positive Delta vergrößert bei Bewegung nach links. Baum: positive Delta bei Bewegung nach rechts. */
  widthDelta: (startX: number, clientX: number) => number
  onResize: (widthPx: number) => void
  onCommit: (widthPx: number) => void
}): PanelPointerResizeSession {
  activeAbort?.()

  let dragging = true
  let lastWidth = options.startWidth
  const { target, pointerId } = options

  const cleanup = (commit: boolean) => {
    if (!dragging) return
    dragging = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    try {
      target.releasePointerCapture(pointerId)
    } catch {
      /* already released */
    }
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    clearActiveAbort()
    if (commit) options.onCommit(lastWidth)
  }

  const onMove = (ev: PointerEvent) => {
    if (!dragging) return
    const delta = options.widthDelta(options.startX, ev.clientX)
    lastWidth = clampWidth(options.startWidth + delta, options.minWidth, options.maxWidth)
    options.onResize(lastWidth)
  }

  const onUp = () => cleanup(true)
  const abort = () => cleanup(false)

  target.setPointerCapture(pointerId)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  activeAbort = abort

  return { abort }
}