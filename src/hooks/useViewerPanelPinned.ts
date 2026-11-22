import { useCallback, useState } from 'react'

const STORAGE_KEY = 'fsidx.viewerPanelPinned'

function readPinned(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function useViewerPanelPinned() {
  const [pinned, setPinnedState] = useState(readPinned)

  const setPinned = useCallback((value: boolean) => {
    setPinnedState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
    } catch {
      /* private mode */
    }
  }, [])

  return { pinned, setPinned }
}