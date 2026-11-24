import { describe, expect, it } from 'vitest'
import { normalizeLinkUrl, parseLinkFile, serializeLinkFile, emptyLinkFile } from './link-file'

describe('normalizeLinkUrl', () => {
  it('adds https and rejects non-http', () => {
    expect(normalizeLinkUrl('example.com')).toBe('https://example.com/')
    expect(() => normalizeLinkUrl('javascript:alert(1)')).toThrow()
  })
})

describe('parseLinkFile', () => {
  it('round-trips', () => {
    const doc = emptyLinkFile('Docs', 'https://cursor.com/docs')
    const text = serializeLinkFile(doc)
    const again = parseLinkFile(text)
    expect(again.url).toBe('https://cursor.com/docs')
    expect(again.title).toBe('Docs')
  })
})