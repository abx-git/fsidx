import type { Et2TaskSummary } from '../../types/et2-task'
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
      title: titleByPath?.get(norm) ?? taskId,
    })
  }

  summaries.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  return summaries
}

export function countEt2TasksInSubtree(indexedRelativePaths: string[], dirPath: string): number {
  const dir = normalizeDir(dirPath)
  const et2Segment = `/${et2TasksDirRelative()}/`
  let count = 0
  for (const rel of indexedRelativePaths) {
    const norm = rel.replace(/\\/g, '/')
    if (!isTaskFilePath(norm)) continue
    if (dir === '') {
      if (norm.includes(et2Segment)) count++
    } else if (norm.startsWith(`${dir}${et2Segment}`) || norm.startsWith(`${dir}/${et2TasksDirRelative().replace('.et2', '.et2')}`)) {
      if (norm.startsWith(`${dir}/`) && norm.includes(et2Segment)) count++
    }
  }
  return count
}