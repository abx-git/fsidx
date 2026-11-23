import { describe, expect, it } from 'vitest'
import { mapPlainPrefixToSourceOffset, stripMarkdownInline } from './markdown-view-click'

describe('markdown-view-click', () => {
  it('entfernt einfache Markdown-Syntax', () => {
    expect(stripMarkdownInline('## Hallo **Welt**')).toBe('Hallo Welt')
  })

  it('mappt sichtbares Präfix auf Quell-Offset', () => {
    const block = 'Hallo Welt'
    const prefix = 'Hallo W'
    expect(mapPlainPrefixToSourceOffset(block, prefix)).toBeGreaterThan(0)
    expect(stripMarkdownInline(block.slice(0, mapPlainPrefixToSourceOffset(block, prefix)))).toBe(
      prefix,
    )
  })
})