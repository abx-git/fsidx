import type { FileIndexManifest, IndexEntry, IndexNode } from '../types'
import { nextNodeId } from './id'
import { extensionFromName, mimeHintForExtension } from './mime-hint'
import type { RawFileRow } from './build-manifest'

function parentPathOf(filePath: string): string {
  const idx = filePath.lastIndexOf('/')
  return idx === -1 ? '' : filePath.slice(0, idx)
}

function findNode(manifest: FileIndexManifest, path: string): IndexNode | null {
  if (path === '') return manifest.tree
  const parts = path.split('/')
  let current: IndexNode | null = manifest.tree
  for (const part of parts) {
    if (!current?.children) return null
    current = current.children.find((c) => c.name === part) ?? null
  }
  return current
}

export function appendFileToManifest(
  manifest: FileIndexManifest,
  row: RawFileRow,
): FileIndexManifest {
  if (manifest.entries.some((e) => e.path === row.relativePath)) {
    return manifest
  }

  const ext = extensionFromName(row.name)
  const node: IndexNode = {
    id: nextNodeId(),
    kind: 'file',
    name: row.name,
    path: row.relativePath,
    depth: row.relativePath.split('/').length,
    extension: ext,
    mimeHint: ext ? mimeHintForExtension(ext) : undefined,
    size: row.size,
    lastModified: row.lastModified,
  }

  const parent = findNode(manifest, parentPathOf(row.relativePath))
  if (parent?.children) {
    parent.children.push(node)
    parent.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }

  const entry: IndexEntry = {
    id: node.id,
    kind: 'file',
    name: node.name,
    path: node.path,
    parentPath: parentPathOf(row.relativePath),
    depth: node.depth,
    extension: node.extension,
    size: node.size,
    lastModified: node.lastModified,
    searchText: [node.name, node.path, node.extension ?? '', 'file'].join(' ').toLowerCase(),
  }

  const entries = [...manifest.entries, entry]
  let files = manifest.stats.files + 1
  const totalBytes = manifest.stats.totalBytes + (row.size ?? 0)

  return {
    ...manifest,
    indexedAt: new Date().toISOString(),
    entries,
    stats: {
      ...manifest.stats,
      files,
      totalBytes,
    },
  }
}