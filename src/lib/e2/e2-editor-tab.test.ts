import { describe, expect, it } from 'vitest'
import { normalizeE2EditorPathParam } from './e2-editor-tab'

describe('e2-editor-tab', () => {
  it('akzeptiert gültige .e2.json Pfade', () => {
    expect(normalizeE2EditorPathParam('proj/Board.e2.json')).toBe('proj/Board.e2.json')
  })

  it('lehnt Traversal ab', () => {
    expect(normalizeE2EditorPathParam('../secret.e2.json')).toBeNull()
    expect(normalizeE2EditorPathParam('a/../b.e2.json')).toBeNull()
  })
})