import { isEt2InternalPath } from './et2/is-et2-internal'
import { isTaskFilePath } from './et2/paths'
import { isTskJsonPath } from './et2/tsk-paths'

export interface TreeDisplayFilterState {
  /** „Dateien“-Filter aktiv (eingeschaltet). */
  showFiles: boolean
  /** „Aufgaben“-Filter aktiv (eingeschaltet). */
  showTasks: boolean
}

/** Beide aus → keine Dateien im Baum (nur Ordner); sonst nur die aktiven Kategorien. */
export function shouldShowFileInTree(
  relativePath: string,
  filter: TreeDisplayFilterState,
  showEt2DotFiles: boolean,
): boolean {
  if (isEt2InternalPath(relativePath, showEt2DotFiles)) {
    return false
  }

  const isTask = isTaskFilePath(relativePath) || isTskJsonPath(relativePath)

  if (!filter.showFiles && !filter.showTasks) {
    return false
  }

  if (filter.showFiles && filter.showTasks) {
    return true
  }

  if (isTask) {
    return filter.showTasks
  }

  return filter.showFiles
}

/** Legacy-`.et2`-Ordner im Baum ausblenden (außer „anzeigen“ aktiv). */
export function shouldShowDirectoryInTree(relativePath: string, showEt2DotFiles: boolean): boolean {
  if (showEt2DotFiles) return true
  const norm = relativePath.replace(/\\/g, '/')
  if (norm === '.et2' || norm.endsWith('/.et2')) return false
  return !norm.includes('/.et2/')
}