import type { IndexEntry } from '../../types'
import { isBundledTaskRef, isTaskFilePath, isTasksBundlePath, taskIdFromPath } from './paths'
import { isTskJsonPath } from './tsk-paths'
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
    if (!isTaskFilePath(e.path) && !isTasksBundlePath(e.path) && !isTskJsonPath(e.path)) continue
    const taskId = taskIdFromPath(e.path) ?? (isTasksBundlePath(e.path) ? 'tasks' : e.name)
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
  const fromMap: Et2SearchHit[] = []
  if (titleByPath) {
    for (const [relativePath, title] of titleByPath) {
      if (!isBundledTaskRef(relativePath)) continue
      const parentPath = relativePath.includes('/')
        ? relativePath.slice(0, relativePath.lastIndexOf('/')).split('#')[0]
        : ''
      fromMap.push({
        relativePath,
        taskId: relativePath.split('#')[1] ?? '',
        displayName: title,
        parentPath,
        titleHint: title,
      })
    }
  }
  const all = [...hits, ...fromMap]
  const seen = new Set<string>()
  const unique = all.filter((h) => {
    if (seen.has(h.relativePath)) return false
    seen.add(h.relativePath)
    return true
  })
  return unique.filter((h) => {
    const title = titleByPath?.get(h.relativePath) ?? h.titleHint
    const hay = `${title} ${h.taskId} ${h.relativePath} task et2`.toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}

export function et2SearchHitToIndexEntry(h: Et2SearchHit): IndexEntry {
  const bundlePath = h.relativePath.split('#')[0]
  const parentPath = bundlePath.includes('/')
    ? bundlePath.slice(0, bundlePath.lastIndexOf('/'))
    : ''
  return {
    id: `et2-search-${h.relativePath}`,
    kind: 'file',
    name: h.titleHint || h.displayName,
    path: h.relativePath,
    parentPath,
    depth: h.relativePath.replace(/#/g, '/').split('/').length,
    extension: isTskJsonPath(bundlePath) ? 'tsk.json' : 'md',
    searchText: `${h.titleHint} ${h.relativePath} aufgabe task`,
  }
}