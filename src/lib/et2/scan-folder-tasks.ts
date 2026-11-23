import type { Et2TaskSummary } from '../../types/et2-task'
import { isEntryInScope, relativeFolderWithinScope } from '../workspace-scope'
import { et2TasksDirRelative, isTaskFilePath, taskIdFromPath } from './paths'

function normalizeDir(dirPath: string): string {
  return dirPath.replace(/\\/g, '/').replace(/\/$/, '')
}

/** Alle `.task.md` unter `dirPath/.et2/tasks/` aus indexierten Pfaden. */
export function scanFolderTasks(
  indexedRelativePaths: string[],
  dirPath: string,
  titleByPath?: Map<string, string>,
): Et2TaskSummary[] {
  const dir = normalizeDir(dirPath)
  const prefix = dir ? `${dir}/${et2TasksDirRelative()}/` : `${et2TasksDirRelative()}/`
  const summaries: Et2TaskSummary[] = []

  for (const rel of indexedRelativePaths) {
    const norm = rel.replace(/\\/g, '/')
    if (!norm.startsWith(prefix) && !(dir === '' && norm.startsWith(`${et2TasksDirRelative()}/`))) {
      continue
    }
    if (!isTaskFilePath(norm)) continue
    const taskId = taskIdFromPath(norm)
    if (!taskId) continue
    summaries.push({
      relativePath: norm,
      taskId,
      title: titleByPath?.get(norm) ?? 'Unbenannte Aufgabe',
    })
  }

  summaries.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  return summaries
}

/** Alle Tasks im Teilbaum unter `scopePath` (Scope-Ordner inkl. Nachkommen). */
export function scanSubtreeTasks(
  indexedRelativePaths: string[],
  scopePath: string,
  titleByPath?: Map<string, string>,
): Et2TaskSummary[] {
  const summaries: Et2TaskSummary[] = []

  for (const rel of indexedRelativePaths) {
    const norm = rel.replace(/\\/g, '/')
    if (!isTaskFilePath(norm)) continue
    if (!isEntryInScope(norm, scopePath)) continue
    const taskId = taskIdFromPath(norm)
    if (!taskId) continue
    summaries.push({
      relativePath: norm,
      taskId,
      title: titleByPath?.get(norm) ?? 'Unbenannte Aufgabe',
      folderWithinScope: relativeFolderWithinScope(norm, scopePath),
    })
  }

  summaries.sort((a, b) => {
    const folder = (a.folderWithinScope ?? '').localeCompare(b.folderWithinScope ?? '', undefined, {
      sensitivity: 'base',
    })
    if (folder !== 0) return folder
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  })
  return summaries
}

export function countEt2TasksInSubtree(indexedRelativePaths: string[], scopePath: string): number {
  return scanSubtreeTasks(indexedRelativePaths, scopePath).length
}