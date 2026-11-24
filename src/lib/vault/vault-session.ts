import type { VaultDiskRef } from './vault-index'

export interface VaultSessionEntry {
  key: CryptoKey
  diskRefs: Map<string, VaultDiskRef>
}

const sessions = new Map<string, VaultSessionEntry>()

export function setVaultUnlocked(vaultRoot: string, key: CryptoKey, diskRefs: VaultDiskRef[]): void {
  sessions.set(vaultRoot, {
    key,
    diskRefs: new Map(diskRefs.map((r) => [r.logicalPath, r])),
  })
}

export function lockVault(vaultRoot: string): void {
  sessions.delete(vaultRoot)
}

export function lockAllVaults(): void {
  sessions.clear()
}

export function isVaultUnlocked(vaultRoot: string): boolean {
  return sessions.has(vaultRoot)
}

export function getVaultSession(vaultRoot: string): VaultSessionEntry | null {
  return sessions.get(vaultRoot) ?? null
}

export function unlockedVaultRoots(): string[] {
  return [...sessions.keys()]
}