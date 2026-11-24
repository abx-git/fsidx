import type { FileSourceStore } from '../file-sources'
import { findDecryptedEntryInDir } from './vault-disk-lookup'
import { vaultRootForPath } from './vault-paths'
import { getVaultSession, upsertVaultDiskRef } from './vault-session'
import { readDecryptedVaultFile, writeEncryptedVaultFile, createEncryptedVaultDirectory } from './vault-index'
import { VAULT_MARKER_FILENAME } from './marker'

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

export function vaultIoApplies(store: FileSourceStore | null, relativePath: string): boolean {
  if (!store?.vaultRoots?.length) return false
  const root = vaultRootForPath(relativePath, new Set(store.vaultRoots))
  if (!root) return false
  if (!getVaultSession(root)) return false
  return relativePath !== root && !relativePath.endsWith(`/${VAULT_MARKER_FILENAME}`)
}

export async function readTextFromVaultStore(
  store: FileSourceStore,
  relativePath: string,
): Promise<string> {
  const vaultRoot = vaultRootForPath(relativePath, new Set(store.vaultRoots ?? []))
  if (!vaultRoot) throw new Error('Kein Tresor-Pfad')
  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error('Tresor gesperrt')
  const handle = store.kind === 'handles' ? store.handles.get(relativePath) : null
  if (!handle) throw new Error('Datei nicht im Tresor-Index')
  const bytes = await readDecryptedVaultFile(session.key, handle)
  return new TextDecoder().decode(bytes)
}

export async function readBlobFromVaultStore(
  store: FileSourceStore,
  relativePath: string,
): Promise<Blob> {
  const vaultRoot = vaultRootForPath(relativePath, new Set(store.vaultRoots ?? []))
  if (!vaultRoot) throw new Error('Kein Tresor-Pfad')
  const session = getVaultSession(vaultRoot)
  if (!session) throw new Error('Tresor gesperrt')
  const handle = store.kind === 'handles' ? store.handles.get(relativePath) : null
  if (!handle) throw new Error('Datei nicht im Tresor-Index')
  const bytes = await readDecryptedVaultFile(session.key, handle)
  const copy = new Uint8Array(bytes)
  return new Blob([copy])
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
    built = `${built}/${plain}`
  }
}