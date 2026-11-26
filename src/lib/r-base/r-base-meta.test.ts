import { describe, expect, it } from 'vitest'
import { isRBaseDatasetMetaText, parseRBaseDatasetMeta } from './r-base-meta'

describe('r-base-meta', () => {
  it('parst gültiges Datensatz-meta', () => {
    const doc = {
      schemaVersion: 1,
      locId: 'RUD-0001',
      bezeichnung: 'Test',
      kategorie: 'Muster',
      lastModified: '2026-01-01T00:00:00.000Z',
      notes: '',
      tags: ['a'],
      files: [{ path: 'doc.pdf', sha256: 'ab', size: 1, mime: 'application/pdf', lastModified: '' }],
      sync: { lastSyncedAt: null, remoteEtag: null },
    }
    const parsed = parseRBaseDatasetMeta(doc)
    expect(parsed?.locId).toBe('RUD-0001')
    expect(isRBaseDatasetMetaText(JSON.stringify(doc))).toBe(true)
  })

  it('lehnt fremdes JSON ab', () => {
    expect(parseRBaseDatasetMeta({ version: 1 })).toBeNull()
    expect(isRBaseDatasetMetaText('{"title":"x"}')).toBe(false)
  })
})