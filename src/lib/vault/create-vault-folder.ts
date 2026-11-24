import type { RawFileRow } from '../build-manifest'
import type { FileSourceStore } from '../file-sources'
import { ensureDirectoryOnDisk, directoryRow } from '../create-workspace'
import { sanitizeNewName } from '../create-workspace'
import { vaultMarkerContent, vaultMarkerPath } from './marker'

export async function createVaultFolderInScope(
  store: FileSourceStore,
  parentPath: string,
  folderName: string,
): Promise<{ relativePath: string; rows: RawFileRow[]; vaultRoot: string }> {
  const safe = sanitizeNewName(folderName, 'Tresor')
  const relativePath = parentPath ? `${parentPath}/${safe}` : safe
  await ensureDirectoryOnDisk(store, relativePath)
  const markerPath = vaultMarkerPath(relativePath)
  const markerText = vaultMarkerContent(safe)
  if (store.kind !== 'handles') {
    throw new Error('Verschlüsselter Ordner: Schreibzugriff (Chrome/Edge) nötig.')
  }
  const parts = markerPath.split('/')
  const fileName = parts.pop()!
  let dir = store.root
  for (const seg of parts) {
    dir = await dir.getDirectoryHandle(seg)
  }
  const handle = await dir.getFileHandle(fileName, { create: true })
  const w = await handle.createWritable()
  await w.write(markerText)
  await w.close()
  store.handles.set(markerPath, handle)

  const rows: RawFileRow[] = [
    directoryRow(relativePath),
    {
      relativePath: markerPath,
      name: fileName,
      kind: 'file',
      size: new Blob([markerText]).size,
      lastModified: Date.now(),
    },
  ]
  return { relativePath, rows, vaultRoot: relativePath }
}