import type { FileIndexManifest } from '../types'
import type { RawFileRow } from './build-manifest'
import type { FileSourceStore } from './file-sources'
import { appendRowsToManifest } from './manifest-append'
import { childEntriesAt, groupEntriesByParent } from './manifest-children'
import { removePathFromManifest } from './manifest-remove'
import { rebuildManifestTreeFromEntries } from './manifest-sync-tree'
import { listDirectoryRowsAtHandle } from './directory-picker'

function childPathSet(rows: RawFileRow[]): Set<string> {
  return new Set(rows.map((r) => r.relativePath))
}

/**
 * Gleicht einen Ordner (eine Ebene + bekannte Unterbäume bei Entfernung) mit dem Dateisystem ab.
 * Behebt Abweichungen, wenn Dateien außerhalb von fsidx hinzugekommen oder gelöscht wurden.
 */
export async function refreshScopeFromDisk(
  manifest: FileIndexManifest,
  scopePath: string,
  store: FileSourceStore,
): Promise<FileIndexManifest | null> {
  if (store.kind !== 'handles') return null

  const diskRows = await listDirectoryRowsAtHandle(
    store.root,
    scopePath,
    store.handles,
    store.vaultRoots ?? [],
  )
  const diskPaths = childPathSet(diskRows)
  const byParent = groupEntriesByParent(manifest.entries)
  const indexedChildren = childEntriesAt(byParent, scopePath)

  let next = manifest
  let changed = false

  for (const child of indexedChildren) {
    if (diskPaths.has(child.path)) continue
    const removed = removePathFromManifest(
      next,
      child.path,
      child.kind === 'directory' ? 'directory' : 'file',
    )
    if (removed) {
      next = removed
      changed = true
    }
  }

  const indexedPaths = new Set(next.entries.map((e) => e.path))
  const toAdd = diskRows.filter((r) => !indexedPaths.has(r.relativePath))
  if (toAdd.length > 0) {
    next = appendRowsToManifest(next, toAdd)
    changed = true
  }

  if (!changed) return null
  return rebuildManifestTreeFromEntries(next)
}