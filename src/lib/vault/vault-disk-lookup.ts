import { decryptVaultName } from './crypto'
import { VAULT_MARKER_FILENAME } from './marker'

export async function findDecryptedEntryInDir(
  key: CryptoKey,
  dir: FileSystemDirectoryHandle,
  plainName: string,
): Promise<{ encryptedName: string; handle: FileSystemHandle } | null> {
  for await (const [encryptedName, handle] of dir.entries()) {
    if (encryptedName === VAULT_MARKER_FILENAME) continue
    try {
      const decryptedName = await decryptVaultName(key, encryptedName)
      if (decryptedName === plainName) {
        return { encryptedName, handle }
      }
    } catch {
      continue
    }
  }
  return null
}