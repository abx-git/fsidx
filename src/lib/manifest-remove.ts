import type { FileIndexManifest, IndexNode, ManifestStats } from '../types'
import { findNodeByPath } from './build-manifest'
import { sidecarPathForFile } from './sidecar'

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

function pathsToRemove(
  manifest: FileIndexManifest,
  targetPath: string,
  kind: 'file' | 'directory',
): Set<string> {
  const norm = targetPath.replace(/\\/g, '/')
  const remove = new Set<string>()
  if (kind === 'file') {
    remove.add(norm)
    const sidecar = sidecarPathForFile(norm)
    if (manifest.entries.some((e) => e.path === sidecar)) remove.add(sidecar)
    return remove
  }
  for (const e of manifest.entries) {
    if (e.path === norm || e.path.startsWith(`${norm}/`)) remove.add(e.path)
  }
  return remove
}

function removeFromTree(root: IndexNode, targetPath: string): void {
  const parentPath = targetPath.includes('/')
    ? targetPath.slice(0, targetPath.lastIndexOf('/'))
    : ''
  const parent = findNodeByPath(root, parentPath)
  if (!parent?.children) return
  parent.children = parent.children.filter((c) => c.path !== targetPath)
}

export function removePathFromManifest(
  manifest: FileIndexManifest,
  targetPath: string,
  kind: 'file' | 'directory',
): FileIndexManifest | null {
  const norm = targetPath.replace(/\\/g, '/')
  if (!norm) return null

  const drop = pathsToRemove(manifest, norm, kind)
  if (drop.size === 0) return null

  const tree = structuredClone(manifest.tree) as IndexNode
  removeFromTree(tree, norm)

  const entries = manifest.entries.filter((e) => !drop.has(e.path))

  return {
    ...manifest,
    indexedAt: new Date().toISOString(),
    stats: computeStats(tree),
    tree,
    entries,
  }
}