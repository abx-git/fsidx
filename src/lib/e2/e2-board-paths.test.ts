import { describe, expect, it } from 'vitest'
import { isE2JsonPath, isE2BoardSnapshotText, pickNewE2Path } from './e2-board-paths'
import { newE2BoardJson } from './e2-board-template'

describe('e2-board-paths', () => {
  it('detects .e2.json paths', () => {
    expect(isE2JsonPath('foo/bar.e2.json')).toBe(true)
    expect(isE2JsonPath('other.json')).toBe(false)
  })

  it('validates minimal v2 snapshot', () => {
    expect(isE2BoardSnapshotText(newE2BoardJson())).toBe(true)
  })

  it('picks unique path', () => {
    expect(pickNewE2Path('proj', ['proj/Board.e2.json'])).toBe('proj/Board-2.e2.json')
  })
})