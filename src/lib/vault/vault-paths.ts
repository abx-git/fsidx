import { isVaultMarkerPath, VAULT_MARKER_FILENAME, vaultMarkerPath } from './marker'

/** Ordner, die eine `.fsidx-vault.json` tragen (Klartext-Pfad im Manifest). `''` = ganzer Workspace-Root. */
export type VaultRoots = ReadonlySet<string>

export function isPathUnderVaultRoot(path: string, vaultRoot: string): boolean {
  if (vaultRoot === '') return path !== ''
  return path === vaultRoot || path.startsWith(`${vaultRoot}/`)
}

export function vaultRootForPath(path: string, vaultRoots: VaultRoots): string | null {
  if (vaultRoots.has('')) return ''
  let best: string | null = null
  for (const root of vaultRoots) {
    if (root === '') continue
    if (path === root || path.startsWith(`${root}/`)) {
      if (!best || root.length > best.length) best = root
    }
  }
  return best
}

export function isPathInVault(path: string, vaultRoots: VaultRoots): boolean {
  if (vaultRoots.has('')) {
    return path !== '' || vaultRoots.size === 1
  }
  return vaultRootForPath(path, vaultRoots) !== null
}

export function scopeVaultRoot(scopePath: string, vaultRoots: readonly string[]): string | null {
  if (vaultRoots.includes('')) return ''
  return vaultRoots.find((r) => scopePath === r || scopePath.startsWith(`${r}/`)) ?? null
}

export function shouldHideFromFileList(path: string): boolean {
  return isVaultMarkerPath(path)
}

export function vaultMarkerPathForRoot(vaultRoot: string): string {
  return vaultMarkerPath(vaultRoot)
}

/** Tresor-Wurzeln aus `.fsidx-vault.json`-Einträgen im Manifest. */
export function inferVaultRootsFromMarkerEntries(entryPaths: readonly string[]): string[] {
  const roots = new Set<string>()
  for (const path of entryPaths) {
    if (!isVaultMarkerPath(path)) continue
    roots.add(path === VAULT_MARKER_FILENAME ? '' : path.slice(0, -(VAULT_MARKER_FILENAME.length + 1)))
  }
  return [...roots]
}