import type { IndexNode } from '../types'
import {
  shouldShowDirectoryInTree,
  shouldShowFileInTree,
  type TreeDisplayFilterState,
} from './tree-display-filter'

export interface VisibleTreeRow {
  id: string
  path: string
  parentPath: string
  kind: 'directory' | 'file'
  hasChildren: boolean
  expanded: boolean
  depth: number
  node: IndexNode
}

export function dirHasVisibleDescendants(
  node: IndexNode,
  filter: TreeDisplayFilterState,
  showEt2DotFiles: boolean,
): boolean {
  for (const child of node.children ?? []) {
    if (child.kind === 'directory') {
      if (!shouldShowDirectoryInTree(child.path, showEt2DotFiles)) continue
      if (dirHasVisibleDescendants(child, filter, showEt2DotFiles)) return true
    } else if (shouldShowFileInTree(child.path, filter, showEt2DotFiles)) {
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

function visibleChildren(
  node: IndexNode,
  filter: TreeDisplayFilterState,
  showEt2DotFiles: boolean,
): IndexNode[] {
  return (node.children ?? []).filter((child) =>
    child.kind === 'directory'
      ? shouldShowDirectoryInTree(child.path, showEt2DotFiles) &&
        dirHasVisibleDescendants(child, filter, showEt2DotFiles)
      : shouldShowFileInTree(child.path, filter, showEt2DotFiles),
  )
}

/** Sichtbare Zeilen in Tiefenfirst-Reihenfolge (für Tastatur ↑↓). */
export function flattenVisibleTree(
  root: IndexNode,
  expandedPaths: Set<string>,
  filter: TreeDisplayFilterState,
  showEt2DotFiles: boolean,
): VisibleTreeRow[] {
  const rows: VisibleTreeRow[] = []

  function walkDir(node: IndexNode): void {
    const kids = visibleChildren(node, filter, showEt2DotFiles)
    const hasChildren = kids.length > 0
    const isRoot = node.path === ''
    if (!isRoot && !hasChildren) return

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
      if (child.kind === 'directory') walkDir(child)
      else if (shouldShowFileInTree(child.path, filter, showEt2DotFiles)) {
        rows.push({
          id: child.id,
          path: child.path,
          parentPath: node.path,
          kind: 'file',
          hasChildren: false,
          expanded: false,
          depth: child.depth,
          node: child,
        })
      }
    }
  }

  walkDir(root)
  return rows
}