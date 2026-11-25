import { describe, expect, it } from 'vitest'
import { shouldShowDirectoryInTree } from './tree-display-filter'
import { isEt2InternalPath } from './et2/is-et2-internal'

describe('shouldShowDirectoryInTree', () => {
  it('blendet Legacy-.et2-Ordner aus (wie Scope/Baum)', () => {
    expect(shouldShowDirectoryInTree('.et2', false)).toBe(false)
    expect(shouldShowDirectoryInTree('proj/.et2', false)).toBe(false)
    expect(shouldShowDirectoryInTree('proj/.et2/tasks', false)).toBe(false)
    expect(shouldShowDirectoryInTree('normal', false)).toBe(true)
  })

  it('zeigt .et2 bei aktivierter Option', () => {
    expect(shouldShowDirectoryInTree('proj/.et2', true)).toBe(true)
  })
})

describe('dateiliste vs baum (ordner)', () => {
  it('interne .et2-unterpfade sind als Dateien und Ordner konsistent versteckt', () => {
    expect(shouldShowDirectoryInTree('x/.et2/cache', false)).toBe(false)
    expect(isEt2InternalPath('x/.et2/cache/data.json', false)).toBe(true)
  })
})