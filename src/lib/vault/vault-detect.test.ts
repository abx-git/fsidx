import { describe, expect, it } from 'vitest'
import { isIgnorableVaultDiskName } from './vault-detect'

describe('isIgnorableVaultDiskName', () => {
  it('ignoriert Tresor-Marker und typische Systemdateien', () => {
    expect(isIgnorableVaultDiskName('.fsidx-vault.json')).toBe(true)
    expect(isIgnorableVaultDiskName('.DS_Store')).toBe(true)
    expect(isIgnorableVaultDiskName('desktop.ini')).toBe(true)
    expect(isIgnorableVaultDiskName('Thumbs.db')).toBe(true)
  })

  it('zählt verschlüsselte Nutzdateien nicht als ignorierbar', () => {
    expect(isIgnorableVaultDiskName('YWJjZGVmZ2hpams')).toBe(false)
    expect(isIgnorableVaultDiskName('notiz.md')).toBe(false)
  })
})