import type { FileSourceStore } from './file-sources'
import { ensureWritePermission } from './file-sources'

async function parentDirAndName(relativePath: string, root: FileSystemDirectoryHandle) {
  const parts = relativePath.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) throw new Error('Ungültiger Pfad')
  let dir = root
  for (const segment of parts) {
    dir = await dir.getDirectoryHandle(segment)
  }
  return { dir, name }
}

export async function deletePathFromStore(
  store: FileSourceStore,
  relativePath: string,
  kind: 'file' | 'directory',
): Promise<void> {
  if (store.kind !== 'handles') {
    throw new Error('Löschen nur mit Chrome/Edge und Schreibzugriff auf den Ordner.')
  }
  if (!(await ensureWritePermission(store))) {
    throw new Error('Schreibzugriff verweigert.')
  }
  if (!relativePath) throw new Error('Der Workspace-Root kann nicht gelöscht werden.')

  const norm = relativePath.replace(/\\/g, '/')
  const { dir, name } = await parentDirAndName(norm, store.root)
  await dir.removeEntry(name, { recursive: kind === 'directory' })

  if (kind === 'file') {
    store.handles.delete(norm)
    return
  }

  const prefix = `${norm}/`
  for (const key of [...store.handles.keys()]) {
    if (key === norm || key.startsWith(prefix)) store.handles.delete(key)
  }
}