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

function joinPath(parent: string, segment: string): string {
  return parent ? `${parent}/${segment}` : segment
}

function buildSearchText(parts: {
  name: string
  path: string
  extension?: string
  kind: string
  extra?: string
}): string {
  return [parts.name, parts.path, parts.extension ?? '', parts.kind, parts.extra ?? '']
    .join(' ')
    .toLowerCase()
}

function rowToEntry(row: RawFileRow, id: string): IndexEntry {
  const parts = row.relativePath.split('/').filter(Boolean)
  const ext = row.kind === 'file' ? extensionFromName(row.name) : undefined
  const taskTag = row.relativePath.includes('/.et2/tasks/') ? 'et2 task' : ''
  return {
    id,
    kind: row.kind,
    name: row.name,
    path: row.relativePath,
    parentPath: parentPathOf(row.relativePath),
    depth: parts.length,
    extension: ext,
    size: row.size,
    lastModified: row.lastModified,
    searchText: buildSearchText({
      name: row.name,
      path: row.relativePath,
      extension: ext,
      kind: row.kind,
      extra: row.kind === 'file' ? taskTag : undefined,
    }),
  }
}

/**
 * Schneller Batch: nur `entries` + Stats. Baum erst später per `rebuildManifestTreeFromEntries`.
 */
export function appendRowsToManifestEntriesOnly(
  manifest: FileIndexManifest,
  rows: RawFileRow[],
): FileIndexManifest {
  if (rows.length === 0) return manifest
  if (rows.length <= 3) {
    let next = manifest
    for (const row of rows) next = appendFileToManifest(next, row)
    return next
  }

  const pathSet = new Set(manifest.entries.map((e) => e.path))
  const newEntries: IndexEntry[] = []
  let filesAdded = 0
  let dirsAdded = 0
  let bytesAdded = 0
  let maxDepth = manifest.stats.maxDepth

  const ensureDir = (dirPath: string, name: string) => {
    if (pathSet.has(dirPath)) return
    const id = nextNodeId()
    pathSet.add(dirPath)
    const depth = dirPath.split('/').filter(Boolean).length
    maxDepth = Math.max(maxDepth, depth)
    dirsAdded += 1
    newEntries.push(
      rowToEntry(
        { relativePath: dirPath, name, kind: 'directory' },
        id,
      ),
    )
  }

  for (const row of rows) {
    if (pathSet.has(row.relativePath)) continue

    const parts = row.relativePath.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let parentPath = ''
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i]!
      const dirPath = joinPath(parentPath, segment)
      ensureDir(dirPath, segment)
      parentPath = dirPath
    }

    const id = nextNodeId()
    pathSet.add(row.relativePath)
  const depth = parts.length
    maxDepth = Math.max(maxDepth, depth)
    newEntries.push(rowToEntry(row, id))
    if (row.kind === 'file') {
      filesAdded += 1
      bytesAdded += row.size ?? 0
    } else {
      dirsAdded += 1
    }
  }

  if (newEntries.length === 0) return manifest

  return {
    ...manifest,
    indexedAt: new Date().toISOString(),
    entries: [...manifest.entries, ...newEntries],
    stats: {
      files: manifest.stats.files + filesAdded,
      directories: manifest.stats.directories + dirsAdded,
      totalBytes: manifest.stats.totalBytes + bytesAdded,
      maxDepth,
    },
  }
}

export function appendRowsToManifest(
  manifest: FileIndexManifest,
  rows: RawFileRow[],
): FileIndexManifest {
  if (rows.length === 0) return manifest
  if (rows.length > 3) {
    return appendRowsToManifestEntriesOnly(manifest, rows)
  }
  let next = manifest
  for (const row of rows) {
    next = appendFileToManifest(next, row)
  }
  return next
}

export function appendFileToManifest(
  manifest: FileIndexManifest,
  row: RawFileRow,
): FileIndexManifest {
  if (manifest.entries.some((e) => e.path === row.relativePath)) {
    return manifest
  }

  let next = manifest
  const parts = row.relativePath.split('/').filter(Boolean)
  if (parts.length === 0) return manifest

  let parentPath = ''
  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i]
    const dirPath = joinPath(parentPath, segment)
    if (!next.entries.some((e) => e.path === dirPath)) {
      next = appendFileToManifest(next, {
        relativePath: dirPath,
        name: segment,
        kind: 'directory',
      })
    }
    parentPath = dirPath
  }

  if (row.kind === 'directory') {
    if (next.entries.some((e) => e.path === row.relativePath)) return next
    const node: IndexNode = {
      id: nextNodeId(),
      kind: 'directory',
      name: row.name,
      path: row.relativePath,
      depth: parts.length,
      children: [],
    }
    const parent = findNode(next, parentPathOf(row.relativePath))
    if (parent?.children) {
      parent.children.push(node)
      parent.children.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
    }
    const entry: IndexEntry = {
      id: node.id,
      kind: 'directory',
      name: node.name,
      path: node.path,
      parentPath: parentPathOf(row.relativePath),
      depth: node.depth,
      searchText: buildSearchText({ name: node.name, path: node.path, kind: 'directory' }),
    }
    return {
      ...next,
      indexedAt: new Date().toISOString(),
      entries: [...next.entries, entry],
      stats: {
        ...next.stats,
        directories: next.stats.directories + 1,
      },
    }
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

  const parent = findNode(next, parentPathOf(row.relativePath))
  if (parent?.children) {
    parent.children.push(node)
    parent.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }

  const taskTag = row.relativePath.includes('/.et2/tasks/') ? 'et2 task' : ''
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
    searchText: buildSearchText({
      name: node.name,
      path: node.path,
      extension: node.extension,
      kind: 'file',
      extra: taskTag,
    }),
  }

  const entries = [...next.entries, entry]
  const files = next.stats.files + 1
  const totalBytes = next.stats.totalBytes + (row.size ?? 0)

  return {
    ...next,
    indexedAt: new Date().toISOString(),
    entries,
    stats: {
      ...next.stats,
      files,
      totalBytes,
    },
  }
}