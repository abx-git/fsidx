import { useCallback, useState } from 'react'

const KEY_WIDTH = 'fsidx.sidebarWidthPx'

const MIN_WIDTH = 280
const MAX_WIDTH = 960
const DEFAULT_WIDTH = 380

function readWidth(): number {
  try {
    const raw = localStorage.getItem(KEY_WIDTH)
    const n = raw ? Number(raw) : DEFAULT_WIDTH
    if (!Number.isFinite(n)) return DEFAULT_WIDTH
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n))
  } catch {
    return DEFAULT_WIDTH
  }
}

export function useViewerSidebarLayout() {
  const [widthPx, setWidthPxState] = useState(readWidth)

  const setWidthPx = useCallback((value: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value))
    setWidthPxState(clamped)
    try {
      localStorage.setItem(KEY_WIDTH, String(clamped))
    } catch {
      /* ignore */
    }
  }, [])

  return {
    widthPx,
    setWidthPx,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
  }
}