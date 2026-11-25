import { VAULT_MARKER_FILENAME } from './marker'
import { directoryHasVaultMarker } from './vault-index'

/** Dateiname wie vom x-be Vault (Base64URL von IV+Ciphertext). */
const OPAQUE_VAULT_NAME = /^[A-Za-z0-9_-]{12,}$/

const VAULT_IGNORABLE_ON_DISK = new Set([
  VAULT_MARKER_FILENAME.toLowerCase(),
  'desktop.ini',
  'thumbs.db',
  '.ds_store',
])

export function isIgnorableVaultDiskName(name: string): boolean {
  const lower = name.toLowerCase()
  if (VAULT_IGNORABLE_ON_DISK.has(lower)) return true
  if (name.startsWith('.')) return true
  return false
}

export function isOpaqueVaultEntryName(name: string): boolean {
  if (name === VAULT_MARKER_FILENAME) return false
  if (name.includes('.') && !name.startsWith('.')) return false
  return OPAQUE_VAULT_NAME.test(name)
}

/** Ordner ohne Marker, aber nur verschlüsselte On-Disk-Namen (typisch x-be Vault). */
export async function looksLikeEncryptedVaultFolder(
  dir: FileSystemDirectoryHandle,
): Promise<boolean> {
  if (await directoryHasVaultMarker(dir)) return true
  let significant = 0
  let opaque = 0
  for await (const [name, child] of dir.entries()) {
    if (name === VAULT_MARKER_FILENAME) return true
    if (isIgnorableVaultDiskName(name)) continue
    if (child.kind !== 'file' && child.kind !== 'directory') continue
    significant++
    if (isOpaqueVaultEntryName(name)) opaque++
    else return false
  }
  return significant > 0 && opaque === significant
}

export async function isVaultDirectory(dir: FileSystemDirectoryHandle): Promise<boolean> {
  return directoryHasVaultMarker(dir) || looksLikeEncryptedVaultFolder(dir)
}