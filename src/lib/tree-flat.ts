import type { IndexNode } from '../types'
import { isIndexedFileInTree, shouldShowDirectoryInTree } from './tree-display-filter'

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

/** Ordner im Baum, auch wenn Dateien nur in der mittleren Liste erscheinen. */
export function directoryHasNavigableContent(node: IndexNode, showEt2DotFiles: boolean): boolean {
  for (const child of node.children ?? []) {
    if (child.kind === 'directory') {
      if (!shouldShowDirectoryInTree(child.path, showEt2DotFiles)) continue
      if (directoryHasNavigableContent(child, showEt2DotFiles)) return true
    } else if (isIndexedFileInTree(child.path, showEt2DotFiles)) {
      return true
    }
  }
  return false
}

function parentPathOf(path: string): string {
  if (!path) return ''
  const i = path.lastIndexOf('/')
  return i < 0 ? '' : path.slice(0, i)
}

function visibleDirectoryChildren(node: IndexNode, showEt2DotFiles: boolean): IndexNode[] {
  return (node.children ?? []).filter(
    (child) =>
      child.kind === 'directory' &&
      shouldShowDirectoryInTree(child.path, showEt2DotFiles) &&
      directoryHasNavigableContent(child, showEt2DotFiles),
  )
}

/** Sichtbare Ordnerzeilen in Tiefenfirst-Reihenfolge (für Tastatur ↑↓). */
export function flattenVisibleTree(
  root: IndexNode,
  expandedPaths: Set<string>,
  showEt2DotFiles: boolean,
): VisibleTreeRow[] {
  const rows: VisibleTreeRow[] = []

  function walkDir(node: IndexNode): void {
    const kids = visibleDirectoryChildren(node, showEt2DotFiles)
    const hasChildren = kids.length > 0
    const isRoot = node.path === ''
    if (!isRoot && !directoryHasNavigableContent(node, showEt2DotFiles)) return

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