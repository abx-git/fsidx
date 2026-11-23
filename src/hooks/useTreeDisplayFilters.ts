import { useCallback, useState } from 'react'
import type { TreeDisplayFilterState } from '../lib/tree-display-filter'

const STORAGE_KEY = 'fsidx.treeFilters'

function readFilters(): TreeDisplayFilterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { showFiles: false, showTasks: false }
    const parsed = JSON.parse(raw) as TreeDisplayFilterState
    return {
      showFiles: Boolean(parsed.showFiles),
      showTasks: Boolean(parsed.showTasks),
    }
  } catch {
    return { showFiles: false, showTasks: false }
  }
}

function persist(filters: TreeDisplayFilterState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch {
    /* ignore */
  }
}

export function useTreeDisplayFilters() {
  const [filter, setFilterState] = useState<TreeDisplayFilterState>(readFilters)

  const setShowFiles = useCallback((value: boolean) => {
    setFilterState((prev) => {
      const next = { ...prev, showFiles: value }
      persist(next)
      return next
    })
  }, [])

  const setShowTasks = useCallback((value: boolean) => {
    setFilterState((prev) => {
      const next = { ...prev, showTasks: value }
      persist(next)
      return next
    })
  }, [])

  return { filter, setShowFiles, setShowTasks }
}