export const VAULT_MARKER_FILENAME = '.fsidx-vault.json'
export const VAULT_FORMAT = 'fsidx-vault-v1'

export interface FsidxVaultMarker {
  format: typeof VAULT_FORMAT
  version: 1
  /** Krypto-Profil (identisch zu x-be Vault) */
  crypto: 'encrypted-vault-v1'
  title?: string
}

export function vaultMarkerContent(title?: string): string {
  const doc: FsidxVaultMarker = {
    format: VAULT_FORMAT,
    version: 1,
    crypto: 'encrypted-vault-v1',
  }
  if (title?.trim()) doc.title = title.trim()
  return `${JSON.stringify(doc, null, 2)}\n`
}

export function parseVaultMarker(text: string): FsidxVaultMarker | null {
  try {
    const o = JSON.parse(text) as Partial<FsidxVaultMarker>
    if (o.format !== VAULT_FORMAT || o.version !== 1) return null
    if (o.crypto !== 'encrypted-vault-v1') return null
    return o as FsidxVaultMarker
  } catch {
    return null
  }
}

export function vaultMarkerPath(vaultDirPath: string): string {
  return vaultDirPath ? `${vaultDirPath}/${VAULT_MARKER_FILENAME}` : VAULT_MARKER_FILENAME
}

export function isVaultMarkerPath(path: string): boolean {
  return path === VAULT_MARKER_FILENAME || path.endsWith(`/${VAULT_MARKER_FILENAME}`)
}