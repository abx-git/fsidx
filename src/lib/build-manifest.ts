import type { FileIndexManifest, IndexEntry, IndexNode, ManifestStats } from '../types'
import { nextNodeId } from './id'
import { extensionFromName, mimeHintForExtension } from './mime-hint'

export interface RawFileRow {
  relativePath: string
  name: string
  kind: 'file' | 'directory'
  size?: number
  lastModified?: number
}

function posixParts(path: string): string[] {
  return path.split('/').filter(Boolean)
}

function joinPath(parent: string, segment: string): string {
  return parent ? `${parent}/${segment}` : segment
}

function buildSearchText(parts: {
  name: string
  path: string
  extension?: string
  kind: string
}): string {
  return [parts.name, parts.path, parts.extension ?? '', parts.kind]
    .join(' ')
    .toLowerCase()
}

export function buildManifestFromRows(
  rootName: string,
  rows: RawFileRow[],
): FileIndexManifest {
  const root: IndexNode = {
    id: nextNodeId(),
    kind: 'directory',
    name: rootName,
    path: '',
    depth: 0,
    children: [],
  }

  const nodeByPath = new Map<string, IndexNode>([['', root]])
  const entries: IndexEntry[] = []

  const sorted = [...rows].sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  for (const row of sorted) {
    const parts = posixParts(row.relativePath)
    if (parts.length === 0) continue

    let parentPath = ''
    for (let i = 0; i < parts.length; i++) {
      const segment = parts[i]
      const isLeaf = i === parts.length - 1
      const currentPath = joinPath(parentPath, segment)

      if (nodeByPath.has(currentPath)) {
        parentPath = currentPath
        continue
      }

      const kind = isLeaf ? row.kind : 'directory'
      const ext =
        kind === 'file' ? extensionFromName(segment) : undefined

      const node: IndexNode = {
        id: nextNodeId(),
        kind,
        name: segment,
        path: currentPath,
        depth: i + 1,
        extension: ext,
        mimeHint: ext ? mimeHintForExtension(ext) : undefined,
        size: isLeaf && kind === 'file' ? row.size : undefined,
        lastModified: isLeaf ? row.lastModified : undefined,
        children: kind === 'directory' ? [] : undefined,
      }

      const parent = nodeByPath.get(parentPath)
      if (parent?.children) parent.children.push(node)
      nodeByPath.set(currentPath, node)

      entries.push({
        id: node.id,
        kind: node.kind,
        name: node.name,
        path: node.path,
        parentPath,
        depth: node.depth,
        extension: node.extension,
        size: node.size,
        lastModified: node.lastModified,
        searchText: buildSearchText({
          name: node.name,
          path: node.path,
          extension: node.extension,
          kind: node.kind,
        }),
      })

      parentPath = currentPath
    }
  }

  sortChildrenRecursive(root)

  const stats = computeStats(root)

  return {
    version: 1,
    indexedAt: new Date().toISOString(),
    rootName,
    stats,
    tree: root,
    entries,
  }
}

function sortChildrenRecursive(node: IndexNode): void {
  if (!node.children) return
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  for (const child of node.children) sortChildrenRecursive(child)
}

function computeStats(root: IndexNode): ManifestStats {
  let files = 0
  let directories = 0
  let totalBytes = 0
  let maxDepth = 0

  const walk = (node: IndexNode) => {
    maxDepth = Math.max(maxDepth, node.depth)
    if (node.kind === 'file') {
      files += 1
      totalBytes += node.size ?? 0
    } else if (node.path !== '') {
      directories += 1
    }
    node.children?.forEach(walk)
  }
  walk(root)
  directories += 1

  return { files, directories, totalBytes, maxDepth }
}

export function findNodeByPath(root: IndexNode, path: string): IndexNode | null {
  if (path === '') return root
  const parts = posixParts(path)
  let current: IndexNode | null = root
  for (const part of parts) {
    if (!current?.children) return null
    current = current.children.find((c) => c.name === part) ?? null
  }
  return current
}

export function downloadManifestJson(manifest: FileIndexManifest, fileName?: string): void {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName ?? `${manifest.rootName}-index.json`
  anchor.click()
  URL.revokeObjectURL(url)
}