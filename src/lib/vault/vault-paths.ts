import { isVaultMarkerPath } from './marker'

/** Ordner, die eine `.fsidx-vault.json` tragen (Klartext-Pfad im Manifest). */
export type VaultRoots = ReadonlySet<string>

export function isPathInVault(path: string, vaultRoots: VaultRoots): boolean {
  if (!path) return false
  for (const root of vaultRoots) {
    if (path === root || path.startsWith(`${root}/`)) return true
  }
  return false
}

export function vaultRootForPath(path: string, vaultRoots: VaultRoots): string | null {
  let best: string | null = null
  for (const root of vaultRoots) {
    if (path === root || path.startsWith(`${root}/`)) {
      if (!best || root.length > best.length) best = root
    }
  }
  return best
}

export function shouldHideFromFileList(path: string): boolean {
  return isVaultMarkerPath(path)
}