import { describe, expect, it } from 'vitest'
import {
  decryptVaultName,
  decryptVaultContent,
  deriveVaultKeyFromPassword,
  encryptVaultContent,
  encryptVaultName,
} from './crypto'

describe('vault crypto (x-be compatible)', () => {
  it('roundtrips name and content with password key', async () => {
    const key = await deriveVaultKeyFromPassword('test-passphrase-fsidx')
    const encName = await encryptVaultName(key, 'geheim.md')
    const plainName = await decryptVaultName(key, encName)
    expect(plainName).toBe('geheim.md')

    const text = new TextEncoder().encode('# Hallo Tresor')
    const enc = await encryptVaultContent(key, text)
    const dec = await decryptVaultContent(key, enc)
    expect(new TextDecoder().decode(dec)).toBe('# Hallo Tresor')
  })
})