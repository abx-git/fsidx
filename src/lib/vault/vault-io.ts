import type { FileSourceStore } from '../file-sources'
import { extensionFromName, mimeHintForExtension } from '../mime-hint'
import { findDecryptedEntryInDir } from './vault-disk-lookup'
import { vaultRootForPath } from './vault-paths'
import { getVaultSession, upsertVaultDiskRef } from './vault-session'
import { readDecryptedVaultFile, writeEncryptedVaultFile, createEncryptedVaultDirectory } from './vault-index'
import { VAULT_MARKER_FILENAME } from './marker'

type HandlesStore = Extract<FileSourceStore, { kind: 'handles' }>

async function resolveVaultDir(
  store: FileSourceStore,
  vaultRoot: string,
  logicalDir: string,
): Promise<FileSystemDirectoryHandle> {
  if (store.kind !== 'handles') throw new Error('Tresor: handles nötig')
  const key = getVaultSession(vaultRoot)?.key
  if (!key) throw new Error('Tresor ist gesperrt.')

  const rootParts = vaultRoot.split('/').filter(Boolean)
  let dir = store.root
  for (const seg of rootParts) {
    dir = await dir.getDirectoryHandle(seg)
  }

  const innerParts =
    vaultRoot === ''
      ? logicalDir.split('/').filter(Boolean)
      : logicalDir.slice(vaultRoot.length + 1).split('/').filter(Boolean)
  for (const plainSeg of innerParts) {
    const found = await findDecryptedEntryInDir(key, dir, plainSeg)
    if (!found || found.handle.kind !== 'directory') {
      throw new Error(`Tresor-Ordner nicht gefunden: ${plainSeg}`)
    }
    dir = found.handle as FileSystemDirectoryHandle
  }
  return dir
}

export function isVaultEncryptedPath(store: FileSourceStore | null, relativePath: string): boolean {
  if (!store?.vaultRoots?.length) return false
  const root = vaultRootForPath(relativePath, new Set(store.vaultRoots))
  if (root === null) return false
  if (relativePath === root) return false
  if (relativePath.endsWith(`/${VAULT_MARKER_FILENAME}`)) return false
  return true
}

export function vaultIoApplies(store: FileSourceStore | null, relativePath: string): boolean {
  if (!isVaultEncryptedPath(store, relativePath)) return false
  const root = vaultRootForPath(relativePath, new Set(store!.vaultRoots!))!
  return getVaultSession(root) !== null
}

const VAULT_LOCKED_READ_MSG = 'Tresor ist gesperrt — zum Anzeigen entsperren.'

export function assertVaultReadableForPath(store: FileSourceStore, relativePath: string): void {
  if (!isVaultEncryptedPath(store, relativePath)) return
  if (!vaultIoApplies(store, relativePath)) {
    throw new Error(VAULT_LOCKED_READ_MSG)
  }
}

async function resolveVaultFileHandle(
  store: HandlesStore,
  vaultRoot: string,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  const cached = store.handles.get(relativePath)
  if (cached) return cached

  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error(VAULT_LOCKED_READ_MSG)

  const fileName = relativePath.split('/').pop()
  if (!fileName) throw new Error('Ungültiger Tresor-Pfad')

  const slash = relativePath.lastIndexOf('/')
  const parentLogical = slash >= 0 ? relativePath.slice(0, slash) : vaultRoot
  const parentDir = await resolveVaultDir(store, vaultRoot, parentLogical)
  const found = await findDecryptedEntryInDir(session.key, parentDir, fileName)
  if (!found || found.handle.kind !== 'file') {
    throw new Error('Datei nicht im Tresor gefunden')
  }

  const handle = found.handle as FileSystemFileHandle
  store.handles.set(relativePath, handle)
  upsertVaultDiskRef(vaultRoot, { logicalPath: relativePath, encryptedName: found.encryptedName })
  return handle
}

export async function readTextFromVaultStore(
  store: FileSourceStore,
  relativePath: string,
): Promise<string> {
  const vaultRoot = vaultRootForPath(relativePath, new Set(store.vaultRoots ?? []))
  if (!vaultRoot) throw new Error('Kein Tresor-Pfad')
  if (store.kind !== 'handles') throw new Error('Tresor: handles nötig')
  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error(VAULT_LOCKED_READ_MSG)
  const handle = await resolveVaultFileHandle(store, vaultRoot, relativePath)
  const bytes = await readDecryptedVaultFile(session.key, handle)
  return new TextDecoder().decode(bytes)
}

export async function readBlobFromVaultStore(
  store: FileSourceStore,
  relativePath: string,
): Promise<Blob> {
  const vaultRoot = vaultRootForPath(relativePath, new Set(store.vaultRoots ?? []))
  if (!vaultRoot) throw new Error('Kein Tresor-Pfad')
  if (store.kind !== 'handles') throw new Error('Tresor: handles nötig')
  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error(VAULT_LOCKED_READ_MSG)
  const handle = await resolveVaultFileHandle(store, vaultRoot, relativePath)
  const bytes = await readDecryptedVaultFile(session.key, handle)
  const copy = new Uint8Array(bytes)
  const mime = mimeHintForExtension(extensionFromName(relativePath))
  return new Blob([copy], { type: mime })
}

export async function writeBlobToVaultStore(
  store: FileSourceStore,
  relativePath: string,
  data: Blob,
): Promise<FileSystemFileHandle> {
  if (store.kind !== 'handles') throw new Error('Tresor: Schreibzugriff nötig')
  const vaultRoot = vaultRootForPath(relativePath, new Set(store.vaultRoots ?? []))
  if (!vaultRoot) throw new Error('Kein Tresor-Pfad')
  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error('Tresor gesperrt')

  const parts = relativePath.split('/')
  const fileName = parts.pop()!
  const parentLogical = parts.join('/')
  const parentDir = await resolveVaultDir(store, vaultRoot, parentLogical)
  const encoded = new Uint8Array(await data.arrayBuffer())
  const existingHandle = store.handles.get(relativePath)
  const handle = await writeEncryptedVaultFile(
    session.key,
    parentDir,
    fileName,
    encoded,
    existingHandle,
  )
  store.handles.set(relativePath, handle)
  upsertVaultDiskRef(vaultRoot, {
    logicalPath: relativePath,
    encryptedName: handle.name,
  })
  return handle
}

export async function writeTextToVaultStore(
  store: FileSourceStore,
  relativePath: string,
  text: string,
): Promise<FileSystemFileHandle> {
  if (store.kind !== 'handles') throw new Error('Tresor: Schreibzugriff nötig')
  const vaultRoot = vaultRootForPath(relativePath, new Set(store.vaultRoots ?? []))
  if (!vaultRoot) throw new Error('Kein Tresor-Pfad')
  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error('Tresor gesperrt')

  const parts = relativePath.split('/')
  const fileName = parts.pop()!
  const parentLogical = parts.join('/')
  const parentDir = await resolveVaultDir(store, vaultRoot, parentLogical)
  const encoded = new TextEncoder().encode(text)
  const existingHandle = store.handles.get(relativePath)
  const handle = await writeEncryptedVaultFile(
    session.key,
    parentDir,
    fileName,
    encoded,
    existingHandle,
  )
  store.handles.set(relativePath, handle)
  upsertVaultDiskRef(vaultRoot, {
    logicalPath: relativePath,
    encryptedName: handle.name,
  })
  return handle
}

export async function ensureVaultDirectoryOnDisk(
  store: FileSourceStore,
  vaultRoot: string,
  logicalDir: string,
): Promise<void> {
  if (store.kind !== 'handles') throw new Error('Tresor: Schreibzugriff nötig')
  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error('Tresor gesperrt')
  if (vaultRoot !== '' && logicalDir !== vaultRoot && !logicalDir.startsWith(`${vaultRoot}/`)) return

  const segments =
    vaultRoot === ''
      ? logicalDir.split('/').filter(Boolean)
      : logicalDir.slice(vaultRoot.length + 1).split('/').filter(Boolean)
  let dir = store.root
  if (vaultRoot) {
    for (const seg of vaultRoot.split('/').filter(Boolean)) {
      dir = await dir.getDirectoryHandle(seg)
    }
  }
  let built = vaultRoot
  for (const plain of segments) {
    dir = await createEncryptedVaultDirectory(session.key, dir, plain)
    built = built ? `${built}/${plain}` : plain
  }
}

export async function deleteVaultPathFromStore(
  store: FileSourceStore,
  relativePath: string,
  kind: 'file' | 'directory',
): Promise<void> {
  if (store.kind !== 'handles') throw new Error('Tresor: Schreibzugriff nötig')
  const norm = relativePath.replace(/\\/g, '/')
  const vaultRoot = vaultRootForPath(norm, new Set(store.vaultRoots ?? []))
  if (!vaultRoot) throw new Error('Kein Tresor-Pfad')
  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error('Tresor gesperrt')

  if (kind === 'file') {
    const handle = store.handles.get(norm)
    if (!handle) throw new Error('Tresor-Datei nicht im Index')
    const parts = norm.split('/')
    parts.pop()
    const parentLogical = parts.join('/')
    const parentDir = await resolveVaultDir(store, vaultRoot, parentLogical)
    await parentDir.removeEntry(handle.name)
    store.handles.delete(norm)
    return
  }

  const segments = norm.split('/').filter(Boolean)
  const dirName = segments.pop()
  if (!dirName) throw new Error('Ungültiger Tresor-Ordner')
  const parentLogical = segments.join('/')
  const parentDir = await resolveVaultDir(store, vaultRoot, parentLogical)
  const found = await findDecryptedEntryInDir(session.key, parentDir, dirName)
  if (!found || found.handle.kind !== 'directory') {
    throw new Error('Tresor-Ordner nicht gefunden')
  }
  await parentDir.removeEntry(found.encryptedName, { recursive: true })
  const prefix = `${norm}/`
  for (const key of [...store.handles.keys()]) {
    if (key === norm || key.startsWith(prefix)) store.handles.delete(key)
  }
}

export function assertVaultUnlockedForWrite(
  store: FileSourceStore,
  logicalPath: string,
): void {
  const norm = logicalPath.replace(/\\/g, '/')
  const vaultRoot = vaultRootForPath(norm, new Set(store.vaultRoots ?? []))
  if (!vaultRoot) return
  if (norm === vaultRoot || norm.endsWith(`/${VAULT_MARKER_FILENAME}`)) return
  if (!getVaultSession(vaultRoot)) {
    throw new Error('Tresor ist gesperrt — zuerst entsperren, dann Dateien hineinlegen.')
  }
}