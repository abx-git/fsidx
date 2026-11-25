import {
  assertVaultReadableForPath,
  isVaultEncryptedPath,
  readBlobFromVaultStore,
  readTextFromVaultStore,
  vaultIoApplies,
  writeBlobToVaultStore,
  writeTextToVaultStore,
} from './vault/vault-io'

export type FileSourceStore =
  | {
      kind: 'handles'
      rootName: string
      root: FileSystemDirectoryHandle
      handles: Map<string, FileSystemFileHandle>
      /** Pfade zu Ordnern mit `.fsidx-vault.json` */
      vaultRoots?: string[]
    }
  | {
      kind: 'files'
      rootName: string
      files: Map<string, File>
      vaultRoots?: string[]
    }

export async function readTextFromStore(
  store: FileSourceStore,
  relativePath: string,
): Promise<string> {
  assertVaultReadableForPath(store, relativePath)
  if (vaultIoApplies(store, relativePath)) {
    return readTextFromVaultStore(store, relativePath)
  }
  if (store.kind === 'files') {
    const file = store.files.get(relativePath)
    if (!file) throw new Error('Datei nicht im Ordner-Snapshot gefunden.')
    return file.text()
  }

  const handle = await resolveFileHandle(store, relativePath)
  const file = await handle.getFile()
  return file.text()
}

async function resolveFileHandle(
  store: Extract<FileSourceStore, { kind: 'handles' }>,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  if (isVaultEncryptedPath(store, relativePath)) {
    throw new Error('Tresor-Dateien müssen entschlüsselt gelesen werden — Tresor entsperren.')
  }
  const cached = store.handles.get(relativePath)
  if (cached) return cached
  const parts = relativePath.split('/').filter(Boolean)
  const fileName = parts.pop()
  if (!fileName) throw new Error('Ungültiger Dateipfad')
  const dir = await resolveDirectory(store.root, parts.join('/'), false)
  const handle = await dir.getFileHandle(fileName)
  store.handles.set(relativePath, handle)
  return handle
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

export async function writeBlobToStore(
  store: FileSourceStore,
  relativePath: string,
  data: Blob,
): Promise<void> {
  if (store.kind === 'files') {
    throw new Error(
      'Verschieben: Ordner erneut mit Chrome/Edge öffnen (Schreibzugriff). Legacy-Picker ist nur lesend.',
    )
  }

  if (vaultIoApplies(store, relativePath)) {
    await writeBlobToVaultStore(store, relativePath, data)
    return
  }

  const parts = relativePath.split('/')
  const fileName = parts.pop()
  if (!fileName) throw new Error('Ungültiger Pfad')

  const dir = await resolveDirectory(store.root, parts.join('/'), true)
  const handle = await dir.getFileHandle(fileName, { create: true })
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
  store.handles.set(relativePath, handle)
}

export async function writeTextToStore(
  store: FileSourceStore,
  relativePath: string,
  text: string,
): Promise<void> {
  if (vaultIoApplies(store, relativePath)) {
    await writeTextToVaultStore(store, relativePath, text)
    return
  }
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
  assertVaultReadableForPath(store, relativePath)
  if (vaultIoApplies(store, relativePath)) {
    return readBlobFromVaultStore(store, relativePath)
  }
  if (store.kind === 'files') {
    const file = store.files.get(relativePath)
    if (!file) throw new Error('Datei nicht im Ordner-Snapshot gefunden.')
    return file
  }
  const handle = await resolveFileHandle(store, relativePath)
  const file = await handle.getFile()
  return file
}