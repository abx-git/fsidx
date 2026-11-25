import type { RawFileRow } from './build-manifest'
import { ensureWritePermission, writeBlobToStore, type FileSourceStore } from './file-sources'
import { assertVaultUnlockedForWrite } from './vault/vault-io'

function normalizeDroppedRelativePath(scopePath: string, file: File): string {
  const raw = (file.webkitRelativePath || file.name).replace(/\\/g, '/').trim()
  if (!raw || raw.includes('..')) throw new Error(`Ungültiger Pfad: ${file.name}`)
  const joined = scopePath ? `${scopePath}/${raw}` : raw
  return joined.replace(/\/+/g, '/')
}

export function pathsForDroppedFiles(scopePath: string, files: readonly File[]): string[] {
  return files.map((f) => normalizeDroppedRelativePath(scopePath, f))
}

export async function uploadFilesToScope(
  store: FileSourceStore,
  scopePath: string,
  files: readonly File[],
): Promise<RawFileRow[]> {
  if (store.kind !== 'handles') {
    throw new Error('Dateien ablegen: Chrome/Edge mit Schreibzugriff auf den Workspace-Ordner.')
  }
  const granted = await ensureWritePermission(store)
  if (!granted) throw new Error('Schreibzugriff wurde nicht erlaubt.')

  const list = [...files].filter((f) => f.size >= 0 && f.name)
  if (list.length === 0) throw new Error('Keine Dateien zum Hochladen.')

  const rows: RawFileRow[] = []
  for (const file of list) {
    const relativePath = normalizeDroppedRelativePath(scopePath, file)
    assertVaultUnlockedForWrite(store, relativePath)
    await writeBlobToStore(store, relativePath, file)
    rows.push({
      relativePath,
      name: file.name,
      kind: 'file',
      size: file.size,
      lastModified: file.lastModified || Date.now(),
    })
  }
  return rows
}