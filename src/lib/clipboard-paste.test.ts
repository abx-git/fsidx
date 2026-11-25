import { describe, expect, it } from 'vitest'
import { uniqueFileNameInScope } from './clipboard-paste'

describe('uniqueFileNameInScope', () => {
  it('returns desired name when free', () => {
    expect(uniqueFileNameInScope('einfügen.md', new Set())).toBe('einfügen.md')
  })

  it('adds numeric suffix on collision', () => {
    const taken = new Set(['Bild.png', 'Bild-2.png'])
    expect(uniqueFileNameInScope('Bild.png', taken)).toBe('Bild-3.png')
  })

  it('handles names without extension', () => {
    expect(uniqueFileNameInScope('notiz', new Set(['notiz']))).toBe('notiz-2')
  })
})