import type { FileIndexManifest } from '../../types'
import type { FileSourceStore } from '../file-sources'
import type { RawFileRow } from '../build-manifest'
import { buildManifestFromRows } from '../build-manifest'
import { indexVaultDirectory } from './vault-index'
import { setVaultUnlocked } from './vault-session'

/** Entfernt alle Manifest-Kinder unter `vaultRoot` (außer Marker), merged entschlüsselte Zeilen. */
export function stripVaultChildrenFromRows(rows: RawFileRow[], vaultRoot: string): RawFileRow[] {
  const prefix = vaultRoot ? `${vaultRoot}/` : ''
  return rows.filter((r) => {
    if (r.relativePath === vaultRoot) return true
    if (vaultRoot && r.relativePath.startsWith(prefix)) {
      if (r.relativePath === `${vaultRoot}/.fsidx-vault.json`) return true
      return false
    }
    return true
  })
}

export async function unlockVaultAndMergeIndex(
  store: FileSourceStore,
  manifest: FileIndexManifest,
  vaultRoot: string,
  key: CryptoKey,
): Promise<{ manifest: FileIndexManifest; rows: RawFileRow[] }> {
  if (store.kind !== 'handles') {
    throw new Error('Tresor nur mit Ordner-Schreibzugriff.')
  }
  const parts = vaultRoot.split('/').filter(Boolean)
  let dir = store.root
  for (const seg of parts) {
    dir = await dir.getDirectoryHandle(seg)
  }
  const indexed = await indexVaultDirectory(key, dir, vaultRoot)
  setVaultUnlocked(vaultRoot, key, indexed.diskRefs)
  indexed.handles.forEach((h, p) => store.handles.set(p, h))

  const baseRows: RawFileRow[] = manifest.entries.map((e) => ({
    relativePath: e.path,
    name: e.name,
    kind: e.kind,
    size: e.size,
    lastModified: e.lastModified,
  }))
  const stripped = stripVaultChildrenFromRows(baseRows, vaultRoot)
  const merged = [...stripped, ...indexed.rows.filter((r) => r.relativePath !== vaultRoot)]
  const built = buildManifestFromRows(manifest.rootName, merged)
  return { manifest: built, rows: merged }
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