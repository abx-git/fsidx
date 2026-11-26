import { describe, expect, it } from 'vitest'
import {
  inferRBaseRootsFromMarkerEntries,
  isRBaseTechnicalEntryPath,
  scopeRBaseRoot,
} from './rbase-roots'

describe('rbase-roots', () => {
  it('inferiert Workspace-Stämme', () => {
    expect(inferRBaseRootsFromMarkerEntries(['archiv/r-base.project.json', 'a.md'])).toEqual([
      'archiv',
    ])
    expect(inferRBaseRootsFromMarkerEntries(['r-base.project.json'])).toEqual([''])
  })

  it('scope und technische Ordner', () => {
    const roots = new Set(['data'])
    expect(scopeRBaseRoot('data/RUD-1', ['data'])).toBe('data')
    expect(isRBaseTechnicalEntryPath('data/_imports/foo.csv', roots)).toBe(true)
    expect(isRBaseTechnicalEntryPath('data/RUD-1/meta.json', roots)).toBe(false)
  })
})