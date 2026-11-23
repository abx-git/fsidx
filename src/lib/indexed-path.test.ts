import { describe, expect, it } from 'vitest'
import { indexedEntryFullPath } from './indexed-path'

describe('indexedEntryFullPath', () => {
  it('verkettet Stamm und relativen Pfad', () => {
    expect(indexedEntryFullPath('Projekt', 'docs/readme.md')).toBe('Projekt/docs/readme.md')
    expect(indexedEntryFullPath('Projekt', 'root.md')).toBe('Projekt/root.md')
  })
})