import type { IndexEntry, IndexNode } from '../types'
import {
  entryToShallowNode,
  groupEntriesByParent,
  visibleDirectoryChildEntries,
} from './manifest-children'
import { shouldShowDirectoryInTree } from './tree-display-filter'

export interface VisibleTreeRow {
  id: string
  path: string
  parentPath: string
  kind: 'directory'
  hasChildren: boolean
  expanded: boolean
  depth: number
  node: IndexNode
}

/** Ordner im Baum sichtbar (auch leer). */
export function isDirectoryVisibleInTree(node: IndexNode, showEt2DotFiles: boolean): boolean {
  return shouldShowDirectoryInTree(node.path, showEt2DotFiles)
}

function parentPathOf(path: string): string {
  if (!path) return ''
  const i = path.lastIndexOf('/')
  return i < 0 ? '' : path.slice(0, i)
}

/** Sichtbare Ordnerzeilen in Tiefenfirst-Reihenfolge (für Tastatur ↑↓). */
export function flattenVisibleTree(
  root: IndexNode,
  entries: IndexEntry[],
  expandedPaths: Set<string>,
  showEt2DotFiles: boolean,
): VisibleTreeRow[] {
  const byParent = groupEntriesByParent(entries)
  const rows: VisibleTreeRow[] = []

  function walkDir(node: IndexNode): void {
    const kids = visibleDirectoryChildEntries(byParent, node.path, showEt2DotFiles).map(
      entryToShallowNode,
    )
    const hasChildren = kids.length > 0
    const isRoot = node.path === ''
    if (!isRoot && !isDirectoryVisibleInTree(node, showEt2DotFiles)) return

    const expanded = expandedPaths.has(node.path)
    rows.push({
      id: node.id,
      path: node.path,
      parentPath: parentPathOf(node.path),
      kind: 'directory',
      hasChildren,
      expanded,
      depth: node.depth,
      node,
    })

    if (!expanded) return
    for (const child of kids) {
      walkDir(child)
    }
  }

  walkDir(root)
  return rows
}