import { describe, expect, it } from 'vitest'
import { highlightMarkdownCode, resolveHighlightLanguage } from './markdown-highlight'

describe('markdown-highlight', () => {
  it('löst Sprach-Aliase auf', () => {
    expect(resolveHighlightLanguage('ts')).toBe('typescript')
    expect(resolveHighlightLanguage('yml')).toBe('yaml')
  })

  it('markiert TypeScript mit hljs-Spans', () => {
    const { html, hlLanguage } = highlightMarkdownCode(
      'const x: number = 1\n',
      'typescript',
    )
    expect(hlLanguage).toBe('typescript')
    expect(html).toContain('hljs-keyword')
    expect(html).toContain('const')
  })
})