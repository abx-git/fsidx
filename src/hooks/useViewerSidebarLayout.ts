import { useCallback, useState } from 'react'

const KEY_WIDTH = 'fsidx.sidebarWidthPx'
const KEY_USUAL_WIDTH = 'fsidx.sidebarWidthPxUsual'
const KEY_COLLAPSED = 'fsidx.sidebarCollapsed'

const MIN_WIDTH = 280
const MAX_WIDTH = 960
const MAX_WIDTH_DRAWIO = 2400
const DEFAULT_WIDTH = 380

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY_COLLAPSED) === '1'
  } catch {
    return false
  }
}

function clampStoredSidebarWidth(n: number): number {
  return Math.min(MAX_WIDTH_DRAWIO, Math.max(MIN_WIDTH, n))
}

function readWidth(): number {
  try {
    const raw = localStorage.getItem(KEY_WIDTH)
    const n = raw ? Number(raw) : DEFAULT_WIDTH
    if (!Number.isFinite(n)) return DEFAULT_WIDTH
    return clampStoredSidebarWidth(n)
  } catch {
    return DEFAULT_WIDTH
  }
}

/** Breite vor temporärer Verbreiterung (E2 / draw.io), maximal STANDARD-Max. */
export function readUsualSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(KEY_USUAL_WIDTH)
    const n = raw ? Number(raw) : DEFAULT_WIDTH
    if (!Number.isFinite(n)) return DEFAULT_WIDTH
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n))
  } catch {
    return DEFAULT_WIDTH
  }
}

export function useViewerSidebarLayout() {
  const [widthPx, setWidthPxState] = useState(readWidth)
  const [collapsed, setCollapsedState] = useState(readCollapsed)

  const setWidthPx = useCallback(
    (value: number, maxCap = MAX_WIDTH, options?: { persist?: boolean }) => {
      const effectiveMax = Math.min(maxCap, MAX_WIDTH_DRAWIO)
      const clamped = Math.min(effectiveMax, Math.max(MIN_WIDTH, Math.round(value)))
      setWidthPxState(clamped)
      if (options?.persist === false) return
      try {
        localStorage.setItem(KEY_WIDTH, String(clamped))
        if (clamped <= MAX_WIDTH) {
          localStorage.setItem(KEY_USUAL_WIDTH, String(clamped))
        }
      } catch {
        /* ignore */
      }
    },
    [],
  )

  const maxWidthForDrawio = useCallback(() => {
    if (typeof window === 'undefined') return MAX_WIDTH_DRAWIO
    return Math.min(MAX_WIDTH_DRAWIO, Math.floor(window.innerWidth * 0.92))
  }, [])

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value)
    try {
      localStorage.setItem(KEY_COLLAPSED, value ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(KEY_COLLAPSED, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return {
    widthPx,
    setWidthPx,
    sidebarCollapsed: collapsed,
    setSidebarCollapsed: setCollapsed,
    toggleSidebarCollapsed: toggleCollapsed,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    maxWidthDrawio: MAX_WIDTH_DRAWIO,
    maxWidthForDrawio,
  }
}