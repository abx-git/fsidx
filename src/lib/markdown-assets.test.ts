import { describe, expect, it } from 'vitest'
import { joinRelativePath, preprocessObsidianEmbeds, resolveAssetPath } from './markdown-assets'

describe('preprocessObsidianEmbeds', () => {
  it('wandelt ![[img.png]] in Markdown-Bild', () => {
    const out = preprocessObsidianEmbeds('Siehe ![[bilder/foo.png|Screenshot]]')
    expect(out).toContain('![Screenshot](')
    expect(out).toContain('fsidx-wiki:')
  })
})

describe('resolveAssetPath', () => {
  it('löst relative Pfade vom Dokument aus', () => {
    expect(resolveAssetPath('docs/readme.md', 'assets/pic.png')).toBe('docs/assets/pic.png')
    expect(resolveAssetPath('readme.md', './x.png')).toBe('x.png')
  })
})

describe('joinRelativePath', () => {
  it('normalisiert ..', () => {
    expect(joinRelativePath('a/b', '../c.png')).toBe('a/c.png')
  })
})