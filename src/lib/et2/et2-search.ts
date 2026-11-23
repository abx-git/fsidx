import type { IndexEntry } from '../../types'
import { isTaskFilePath, taskIdFromPath } from './paths'
import { normalizeQuery } from '../search'

export interface Et2SearchHit {
  relativePath: string
  taskId: string
  displayName: string
  parentPath: string
  titleHint: string
}

export function listEt2TaskPathsFromEntries(entries: IndexEntry[]): Et2SearchHit[] {
  const hits: Et2SearchHit[] = []
  for (const e of entries) {
    if (e.kind !== 'file') continue
  if (!isTaskFilePath(e.path)) continue
    const taskId = taskIdFromPath(e.path) ?? e.name
    const parentPath = e.parentPath
    hits.push({
      relativePath: e.path,
      taskId,
      displayName: e.name,
      parentPath,
      titleHint: taskId,
    })
  }
  return hits
}

export function searchEt2Tasks(
  hits: Et2SearchHit[],
  query: string,
  titleByPath?: Map<string, string>,
): Et2SearchHit[] {
  const q = normalizeQuery(query)
  if (!q) return []
  const terms = q.split(/\s+/).filter(Boolean)
  return hits.filter((h) => {
    const title = titleByPath?.get(h.relativePath) ?? h.titleHint
    const hay = `${title} ${h.taskId} ${h.relativePath} task et2`.toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}