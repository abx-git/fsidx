export type FileSourceStore =
  | {
      kind: 'handles'
      rootName: string
      root: FileSystemDirectoryHandle
      handles: Map<string, FileSystemFileHandle>
    }
  | {
      kind: 'files'
      rootName: string
      files: Map<string, File>
    }

export async function readTextFromStore(
  store: FileSourceStore,
  relativePath: string,
): Promise<string> {
  if (store.kind === 'files') {
    const file = store.files.get(relativePath)
    if (!file) throw new Error('Datei nicht im Ordner-Snapshot gefunden.')
    return file.text()
  }

  const handle = store.handles.get(relativePath)
  if (!handle) throw new Error('Datei nicht im Index gefunden.')
  const file = await handle.getFile()
  return file.text()
}

async function resolveDirectory(
  root: FileSystemDirectoryHandle,
  relativeDir: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  if (!relativeDir) return root
  let current = root
  for (const segment of relativeDir.split('/').filter(Boolean)) {
    if (create) {
      current = await current.getDirectoryHandle(segment, { create: true })
    } else {
      current = await current.getDirectoryHandle(segment)
    }
  }
  return current
}

export function canWriteToStore(store: FileSourceStore | null): boolean {
  return store?.kind === 'handles'
}

export async function ensureWritePermission(store: FileSourceStore): Promise<boolean> {
  if (store.kind !== 'handles') return false
  const current = await store.root.queryPermission({ mode: 'readwrite' })
  if (current === 'granted') return true
  const next = await store.root.requestPermission({ mode: 'readwrite' })
  return next === 'granted'
}

export async function writeTextToStore(
  store: FileSourceStore,
  relativePath: string,
  text: string,
): Promise<void> {
  if (store.kind === 'files') {
    throw new Error(
      'Sidecar speichern: Ordner erneut mit Chrome/Edge öffnen (Schreibzugriff). Legacy-Picker ist nur lesend — nutze Download.',
    )
  }

  const parts = relativePath.split('/')
  const fileName = parts.pop()
  if (!fileName) throw new Error('Ungültiger Pfad')

  const dir = await resolveDirectory(store.root, parts.join('/'), true)
  const handle = await dir.getFileHandle(fileName, { create: true })
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
  store.handles.set(relativePath, handle)
}

export function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith('.md') || path.toLowerCase().endsWith('.markdown')
}

export async function readBlobFromStore(
  store: FileSourceStore,
  relativePath: string,
): Promise<Blob> {
  if (store.kind === 'files') {
    const file = store.files.get(relativePath)
    if (!file) throw new Error('Datei nicht im Ordner-Snapshot gefunden.')
    return file
  }
  const handle = store.handles.get(relativePath)
  if (!handle) throw new Error('Datei nicht im Index gefunden.')
  const file = await handle.getFile()
  return file
}