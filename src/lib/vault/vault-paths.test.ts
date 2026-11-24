import { describe, expect, it } from 'vitest'
import {
  inferVaultRootsFromMarkerEntries,
  isPathUnderVaultRoot,
  mergeVaultRootLists,
  vaultRootForPath,
} from './vault-paths'

describe('vaultRootForPath', () => {
  it('treats workspace root vault', () => {
    const roots = new Set([''])
    expect(vaultRootForPath('geheim.md', roots)).toBe('')
    expect(vaultRootForPath('ordner/x.md', roots)).toBe('')
  })

  it('nested vault root', () => {
    const roots = new Set(['Tresor'])
    expect(vaultRootForPath('Tresor/a.md', roots)).toBe('Tresor')
    expect(vaultRootForPath('anders/x.md', roots)).toBeNull()
  })
})

describe('mergeVaultRootLists', () => {
  it('merges empty scan with marker manifest', () => {
    expect(
      mergeVaultRootLists([], undefined, ['Tresor'], inferVaultRootsFromMarkerEntries(['Tresor/.fsidx-vault.json'])),
    ).toEqual(expect.arrayContaining(['Tresor']))
  })
})

describe('inferVaultRootsFromMarkerEntries', () => {
  it('reads workspace and nested markers', () => {
    expect(
      inferVaultRootsFromMarkerEntries(['.fsidx-vault.json', 'Tresor/.fsidx-vault.json', 'a.md']),
    ).toEqual(expect.arrayContaining(['', 'Tresor']))
  })
})

describe('isPathUnderVaultRoot', () => {
  it('empty vault root covers all paths', () => {
    expect(isPathUnderVaultRoot('a.md', '')).toBe(true)
    expect(isPathUnderVaultRoot('', '')).toBe(false)
  })
})