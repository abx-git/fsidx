import type { FileIndexManifest } from '../../types'
import type { FileSourceStore } from '../file-sources'
import type { RawFileRow } from '../build-manifest'
import { buildManifestFromRows } from '../build-manifest'
import { indexVaultDirectory } from './vault-index'
import { isVaultUnlocked, lockVault, setVaultUnlocked } from './vault-session'
import { isPathUnderVaultRoot, vaultMarkerPathForRoot } from './vault-paths'

/** Entfernt alle Manifest-Kinder unter `vaultRoot` (außer Marker), vor erneutem Entschlüsseln. */
export function stripVaultChildrenFromRows(rows: RawFileRow[], vaultRoot: string): RawFileRow[] {
  const markerPath = vaultMarkerPathForRoot(vaultRoot)
  return rows.filter((r) => {
    if (r.relativePath === markerPath) return true
    if (vaultRoot === '') {
      return false
    }
    if (r.relativePath === vaultRoot) return true
    const prefix = `${vaultRoot}/`
    if (r.relativePath.startsWith(prefix)) return false
    return true
  })
}

function purgeVaultHandles(store: FileSourceStore, vaultRoot: string): void {
  if (store.kind !== 'handles') return
  const markerPath = vaultMarkerPathForRoot(vaultRoot)
  for (const key of [...store.handles.keys()]) {
    if (key === markerPath) continue
    if (isPathUnderVaultRoot(key, vaultRoot)) store.handles.delete(key)
  }
}

export async function unlockVaultAndMergeIndex(
  store: FileSourceStore,
  manifest: FileIndexManifest,
  vaultRoot: string,
  key: CryptoKey,
): Promise<{ manifest: FileIndexManifest; rows: RawFileRow[]; skippedEntries: number }> {
  if (store.kind !== 'handles') {
    throw new Error('Tresor nur mit Ordner-Schreibzugriff.')
  }
  let dir = store.root
  if (vaultRoot) {
    for (const seg of vaultRoot.split('/').filter(Boolean)) {
      dir = await dir.getDirectoryHandle(seg)
    }
  }
  const indexed = await indexVaultDirectory(key, dir, vaultRoot)
  setVaultUnlocked(vaultRoot, key, indexed.diskRefs)
  purgeVaultHandles(store, vaultRoot)
  indexed.handles.forEach((h, p) => store.handles.set(p, h))

  const baseRows: RawFileRow[] = manifest.entries.map((e) => ({
    relativePath: e.path,
    name: e.name,
    kind: e.kind,
    size: e.size,
    lastModified: e.lastModified,
  }))
  const stripped = stripVaultChildrenFromRows(baseRows, vaultRoot)
  const merged = [
    ...stripped,
    ...indexed.rows.filter((r) => r.relativePath !== vaultRoot && r.relativePath !== ''),
  ]
  const built = buildManifestFromRows(manifest.rootName, merged)
  return { manifest: built, rows: merged, skippedEntries: indexed.skippedEntries }
}

/** Manifest ohne entschlüsselte Tresor-Inhalte, solange der Tresor nicht in dieser Sitzung offen ist. */
export function reconcileLockedVaultsInManifest(
  manifest: FileIndexManifest,
  vaultRoots: readonly string[],
): FileIndexManifest {
  let next = manifest
  for (const root of vaultRoots) {
    if (!isVaultUnlocked(root)) {
      next = lockVaultAndStripManifest(next, root)
    }
  }
  return next
}

/** Tresor in dieser Sitzung schließen: Schlüssel verwerfen, Manifest bereinigen. */
export function closeVaultInSession(
  store: FileSourceStore | null,
  manifest: FileIndexManifest,
  vaultRoot: string,
): FileIndexManifest {
  lockVault(vaultRoot)
  if (store?.kind === 'handles') purgeVaultHandles(store, vaultRoot)
  return lockVaultAndStripManifest(manifest, vaultRoot)
}

export function lockVaultAndStripManifest(
  manifest: FileIndexManifest,
  vaultRoot: string,
): FileIndexManifest {
  const baseRows: RawFileRow[] = manifest.entries.map((e) => ({
    relativePath: e.path,
    name: e.name,
    kind: e.kind,
    size: e.size,
    lastModified: e.lastModified,
  }))
  const stripped = stripVaultChildrenFromRows(baseRows, vaultRoot)
  return buildManifestFromRows(manifest.rootName, stripped)
}