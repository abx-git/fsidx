import { describe, expect, it } from 'vitest'
import { findPreviewBlockIndex } from './markdown-block-nav'

describe('markdown-block-nav', () => {
  it('findet Block nach Zeilenbereich', () => {
    const blocks = [
      { el: null as unknown as HTMLElement, startLine: 2, endLine: 3 },
      { el: null as unknown as HTMLElement, startLine: 5, endLine: 5 },
    ]
    expect(findPreviewBlockIndex(blocks, 2, 3)).toBe(0)
    expect(findPreviewBlockIndex(blocks, 5, 5)).toBe(1)
    expect(findPreviewBlockIndex(blocks, 9, 9)).toBe(-1)
  })
})