import { isEt2InternalPath } from './et2/is-et2-internal'
import { isTaskFilePath } from './et2/paths'
import { isTskJsonPath } from './et2/tsk-paths'

export interface TreeDisplayFilterState {
  /** „Dateien“-Filter aktiv (eingeschaltet). */
  showFiles: boolean
  /** „Aufgaben“-Filter aktiv (eingeschaltet). */
  showTasks: boolean
}

/** Beide aus → alles anzeigen; sonst nur die aktiven Kategorien. */
export function shouldShowFileInTree(
  relativePath: string,
  filter: TreeDisplayFilterState,
  showEt2DotFiles: boolean,
): boolean {
  const isTask = isTaskFilePath(relativePath) || isTskJsonPath(relativePath)

  if (!filter.showFiles && !filter.showTasks) {
    if (isTask) return true
    return !isEt2InternalPath(relativePath, showEt2DotFiles)
  }

  if (isTask) {
    return filter.showTasks
  }

  if (isEt2InternalPath(relativePath, showEt2DotFiles)) {
    return false
  }

  return filter.showFiles
}