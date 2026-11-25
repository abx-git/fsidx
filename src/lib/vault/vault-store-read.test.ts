import { describe, expect, it } from 'vitest'
import type { FileSourceStore } from '../file-sources'
import { readBlobFromStore } from '../file-sources'
import {
  assertVaultReadableForPath,
  isVaultEncryptedPath,
  vaultIoApplies,
} from './vault-io'

function handlesStore(vaultRoots: string[]): FileSourceStore {
  return {
    kind: 'handles',
    rootName: 'demo',
    root: {} as FileSystemDirectoryHandle,
    handles: new Map(),
    vaultRoots,
  }
}

describe('vault store reads', () => {
  it('detects encrypted vault paths', () => {
    const store = handlesStore(['Private'])
    expect(isVaultEncryptedPath(store, 'Private/geheim.pdf')).toBe(true)
    expect(isVaultEncryptedPath(store, 'Private')).toBe(false)
    expect(isVaultEncryptedPath(store, 'Public/x.pdf')).toBe(false)
  })

  it('refuses plaintext fallback while vault is locked', () => {
    const store = handlesStore(['Private'])
    expect(vaultIoApplies(store, 'Private/doc.pdf')).toBe(false)
    expect(() => assertVaultReadableForPath(store, 'Private/doc.pdf')).toThrow(/gesperrt/)
  })

  it('readBlobFromStore does not return ciphertext when locked', async () => {
    const store = handlesStore(['Private'])
    await expect(readBlobFromStore(store, 'Private/doc.pdf')).rejects.toThrow(/gesperrt/)
  })
})