import type { RawFileRow } from '../build-manifest'
import { VAULT_MARKER_FILENAME } from './marker'
import {
  decryptVaultContent,
  decryptVaultName,
  encryptVaultContent,
  encryptVaultName,
} from './crypto'
import { findDecryptedEntryInDir } from './vault-disk-lookup'
import { isIgnorableVaultDiskName } from './vault-detect'

export interface VaultDiskRef {
  /** Pfad im fsidx-Manifest (Klartext) */
  logicalPath: string
  /** Verschlüsselter On-Disk-Dateiname im Elternordner */
  encryptedName: string
}

async function decryptEntry(
  key: CryptoKey,
  encryptedName: string,
  handle: FileSystemHandle,
): Promise<{ decryptedName: string; kind: 'file' | 'directory' } | null> {
  if (encryptedName === VAULT_MARKER_FILENAME) {
    return null
  }
  try {
    const decryptedName = await decryptVaultName(key, encryptedName)
    return { decryptedName, kind: handle.kind }
  } catch {
    return null
  }
}

export async function indexVaultDirectory(
  key: CryptoKey,
  dirHandle: FileSystemDirectoryHandle,
  logicalPrefix: string,
): Promise<{
  rows: RawFileRow[]
  handles: Map<string, FileSystemFileHandle>
  diskRefs: VaultDiskRef[]
  skippedEntries: number
}> {
  const rows: RawFileRow[] = []
  const handles = new Map<string, FileSystemFileHandle>()
  const diskRefs: VaultDiskRef[] = []
  let skippedEntries = 0

  for await (const [encryptedName, child] of dirHandle.entries()) {
    if (encryptedName === VAULT_MARKER_FILENAME) continue
    if (isIgnorableVaultDiskName(encryptedName)) continue
    const decoded = await decryptEntry(key, encryptedName, child)
    if (!decoded) {
      skippedEntries++
      continue
    }

    const logicalPath = logicalPrefix ? `${logicalPrefix}/${decoded.decryptedName}` : decoded.decryptedName

    if (decoded.kind === 'directory') {
      rows.push({ relativePath: logicalPath, name: decoded.decryptedName, kind: 'directory' })
      const nested = await indexVaultDirectory(key, child as FileSystemDirectoryHandle, logicalPath)
      rows.push(...nested.rows)
      nested.handles.forEach((h, p) => handles.set(p, h))
      diskRefs.push(...nested.diskRefs)
      skippedEntries += nested.skippedEntries
    } else {
      let size: number | undefined
      let lastModified: number | undefined
      try {
        const file = await (child as FileSystemFileHandle).getFile()
        size = file.size
        lastModified = file.lastModified
      } catch {
        /* ignore */
      }
      handles.set(logicalPath, child as FileSystemFileHandle)
      diskRefs.push({ logicalPath, encryptedName })
      rows.push({
        relativePath: logicalPath,
        name: decoded.decryptedName,
        kind: 'file',
        size,
        lastModified,
      })
    }
  }

  rows.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'de'))
  return { rows, handles, diskRefs, skippedEntries }
}

export async function directoryHasVaultMarker(dir: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    await dir.getFileHandle(VAULT_MARKER_FILENAME)
    return true
  } catch {
    return false
  }
}

export async function readDecryptedVaultFile(
  key: CryptoKey,
  fileHandle: FileSystemFileHandle,
): Promise<Uint8Array> {
  const file = await fileHandle.getFile()
  const encrypted = await file.arrayBuffer()
  return decryptVaultContent(key, encrypted)
}

export async function updateEncryptedVaultFileContent(
  key: CryptoKey,
  fileHandle: FileSystemFileHandle,
  content: Uint8Array | ArrayBuffer,
): Promise<void> {
  const encryptedContent = await encryptVaultContent(
    key,
    content instanceof Uint8Array ? content : new Uint8Array(content),
  )
  const writable = await fileHandle.createWritable()
  const buffer = encryptedContent.buffer.slice(
    encryptedContent.byteOffset,
    encryptedContent.byteOffset + encryptedContent.byteLength,
  ) as ArrayBuffer
  await writable.write(buffer)
  await writable.close()
}

export async function writeEncryptedVaultFile(
  key: CryptoKey,
  dirHandle: FileSystemDirectoryHandle,
  plainFileName: string,
  content: Uint8Array | ArrayBuffer,
  existingHandle?: FileSystemFileHandle,
): Promise<FileSystemFileHandle> {
  if (existingHandle) {
    await updateEncryptedVaultFileContent(key, existingHandle, content)
    return existingHandle
  }

  const found = await findDecryptedEntryInDir(key, dirHandle, plainFileName)
  if (found?.handle.kind === 'file') {
    const fileHandle = found.handle as FileSystemFileHandle
    await updateEncryptedVaultFileContent(key, fileHandle, content)
    return fileHandle
  }
  if (found?.handle.kind === 'directory') {
    throw new Error(`„${plainFileName}" ist ein Ordner im Tresor.`)
  }

  const encryptedName = await encryptVaultName(key, plainFileName)
  const encryptedContent = await encryptVaultContent(
    key,
    content instanceof Uint8Array ? content : new Uint8Array(content),
  )
  const fileHandle = await dirHandle.getFileHandle(encryptedName, { create: true })
  const writable = await fileHandle.createWritable()
  const buffer = encryptedContent.buffer.slice(
    encryptedContent.byteOffset,
    encryptedContent.byteOffset + encryptedContent.byteLength,
  ) as ArrayBuffer
  await writable.write(buffer)
  await writable.close()
  return fileHandle
}

export async function createEncryptedVaultDirectory(
  key: CryptoKey,
  parent: FileSystemDirectoryHandle,
  plainName: string,
): Promise<FileSystemDirectoryHandle> {
  const found = await findDecryptedEntryInDir(key, parent, plainName)
  if (found?.handle.kind === 'directory') {
    return found.handle as FileSystemDirectoryHandle
  }
  if (found?.handle.kind === 'file') {
    throw new Error(`„${plainName}" existiert als Datei im Tresor.`)
  }

  const encryptedName = await encryptVaultName(key, plainName)
  return parent.getDirectoryHandle(encryptedName, { create: true })
}