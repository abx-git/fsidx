import { useCallback, useState } from 'react'

const STORAGE_KEY = 'fsidx.detailMetadataVisible'

function readVisible(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === null) return false
    return v === '1'
  } catch {
    return true
  }
}

export function useDetailMetadataVisible() {
  const [visible, setVisibleState] = useState(readVisible)

  const setVisible = useCallback((value: boolean) => {
    setVisibleState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
    } catch {
      /* private mode */
    }
  }, [])

  return { visible, setVisible }
}