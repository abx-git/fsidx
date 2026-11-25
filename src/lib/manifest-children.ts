import type { IndexEntry, IndexNode } from '../types'
import { shouldShowDirectoryInTree } from './tree-display-filter'

function compareEntries(a: IndexEntry, b: IndexEntry): number {
  if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

/** Direkte Kinder eines Ordners aus der flachen `entries`-Liste (Quelle der Wahrheit). */
export function groupEntriesByParent(entries: IndexEntry[]): Map<string, IndexEntry[]> {
  const map = new Map<string, IndexEntry[]>()
  for (const e of entries) {
    const list = map.get(e.parentPath)
    if (list) list.push(e)
    else map.set(e.parentPath, [e])
  }
  for (const list of map.values()) list.sort(compareEntries)
  return map
}

export function childEntriesAt(
  byParent: Map<string, IndexEntry[]>,
  parentPath: string,
): IndexEntry[] {
  return byParent.get(parentPath) ?? []
}

export function visibleDirectoryChildEntries(
  byParent: Map<string, IndexEntry[]>,
  parentPath: string,
  showEt2DotFiles: boolean,
): IndexEntry[] {
  return childEntriesAt(byParent, parentPath).filter(
    (e) => e.kind === 'directory' && shouldShowDirectoryInTree(e.path, showEt2DotFiles),
  )
}

/** Tiefe aus Pfadsegmenten (unabhängig von gespeicherter entry.depth). */
export function pathDepth(path: string): number {
  if (!path) return 0
  return path.split('/').filter(Boolean).length
}

export function entryToShallowNode(entry: IndexEntry): IndexNode {
  return {
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    path: entry.path,
    depth: pathDepth(entry.path),
    extension: entry.extension,
    size: entry.size,
    lastModified: entry.lastModified,
    children: entry.kind === 'directory' ? [] : undefined,
  }
}