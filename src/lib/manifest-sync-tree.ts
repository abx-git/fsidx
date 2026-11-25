import type { FileIndexManifest, IndexNode } from '../types'

function sortChildrenRecursive(node: IndexNode): void {
  if (!node.children) return
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  for (const child of node.children) sortChildrenRecursive(child)
}

/** Rekonstruiert `tree` aus `entries`, damit Baum und Dateiliste dieselben Kinder zeigen. */
export function rebuildManifestTreeFromEntries(manifest: FileIndexManifest): FileIndexManifest {
  const rootId = manifest.tree.id
  const root: IndexNode = {
    id: rootId,
    kind: 'directory',
    name: manifest.rootName,
    path: '',
    depth: 0,
    children: [],
  }
  const nodeByPath = new Map<string, IndexNode>([['', root]])

  const sorted = [...manifest.entries].sort(
    (a, b) => a.depth - b.depth || a.path.localeCompare(b.path),
  )

  for (const entry of sorted) {
    const parent = nodeByPath.get(entry.parentPath)
    if (!parent?.children) continue

    const node: IndexNode = {
      id: entry.id,
      kind: entry.kind,
      name: entry.name,
      path: entry.path,
      depth: entry.depth,
      extension: entry.extension,
      size: entry.size,
      lastModified: entry.lastModified,
      children: entry.kind === 'directory' ? [] : undefined,
    }
    parent.children.push(node)
    if (entry.kind === 'directory') nodeByPath.set(entry.path, node)
  }

  sortChildrenRecursive(root)
  return { ...manifest, tree: root }
}