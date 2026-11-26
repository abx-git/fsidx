import { useCallback, useState } from 'react'

const KEY_WIDTH = 'fsidx.treeWidthPx'
const KEY_COLLAPSED = 'fsidx.treeCollapsed'

const MIN_WIDTH = 160
const MAX_WIDTH = 520
const DEFAULT_WIDTH = 240

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

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY_COLLAPSED) === '1'
  } catch {
    return false
  }
}

export function useTreePanelLayout() {
  const [widthPx, setWidthPxState] = useState(readWidth)
  const [collapsed, setCollapsedState] = useState(readCollapsed)

  const setWidthPx = useCallback(
    (value: number, options?: { persist?: boolean }) => {
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)))
      setWidthPxState(clamped)
      if (options?.persist === false) return
      try {
        localStorage.setItem(KEY_WIDTH, String(clamped))
      } catch {
        /* ignore */
      }
    },
    [],
  )

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
    treeWidthPx: widthPx,
    setTreeWidthPx: setWidthPx,
    treeCollapsed: collapsed,
    setTreeCollapsed: setCollapsed,
    toggleTreeCollapsed: toggleCollapsed,
    minTreeWidth: MIN_WIDTH,
    maxTreeWidth: MAX_WIDTH,
  }
}