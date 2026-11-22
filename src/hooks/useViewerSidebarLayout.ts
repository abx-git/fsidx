import { useCallback, useState } from 'react'

const KEY_EXPANDED = 'fsidx.viewerSidebarExpanded'
const KEY_WIDTH = 'fsidx.sidebarWidthPx'

const MIN_WIDTH = 280
const MAX_WIDTH = 960
const DEFAULT_WIDTH = 380

function readExpanded(): boolean {
  try {
    return localStorage.getItem(KEY_EXPANDED) === '1'
  } catch {
    return false
  }
}

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
  const [expanded, setExpandedState] = useState(readExpanded)
  const [widthPx, setWidthPxState] = useState(readWidth)

  const setExpanded = useCallback((value: boolean) => {
    setExpandedState(value)
    try {
      localStorage.setItem(KEY_EXPANDED, value ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

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
    expanded,
    setExpanded,
    toggleExpanded: () => setExpanded(!expanded),
    widthPx,
    setWidthPx,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
  }
}