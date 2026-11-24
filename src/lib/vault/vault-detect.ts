import { VAULT_MARKER_FILENAME } from './marker'
import { directoryHasVaultMarker } from './vault-index'

/** Dateiname wie vom x-be Vault (Base64URL von IV+Ciphertext). */
const OPAQUE_VAULT_NAME = /^[A-Za-z0-9_-]{12,}$/

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
  let total = 0
  let opaque = 0
  for await (const [name, child] of dir.entries()) {
    if (name === VAULT_MARKER_FILENAME) return true
    total++
    if (child.kind === 'file' || child.kind === 'directory') {
      if (isOpaqueVaultEntryName(name)) opaque++
      else return false
    }
  }
  return total > 0 && opaque === total
}

export async function isVaultDirectory(dir: FileSystemDirectoryHandle): Promise<boolean> {
  return directoryHasVaultMarker(dir) || looksLikeEncryptedVaultFolder(dir)
}