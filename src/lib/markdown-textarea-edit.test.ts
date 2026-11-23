import { describe, expect, it } from 'vitest'
import { setHeadingAtCursor, wrapSelection } from './markdown-textarea-edit'

describe('wrapSelection', () => {
  it('umschließt Auswahl', () => {
    const r = wrapSelection('hello world', 6, 11, '**', '**', 'x')
    expect(r.value).toBe('hello **world**')
    expect(r.selectionStart).toBe(8)
    expect(r.selectionEnd).toBe(13)
  })
})

describe('setHeadingAtCursor', () => {
  it('setzt Überschrift in Zeile', () => {
    const r = setHeadingAtCursor('Zeile\nText', 8, 2)
    expect(r.value).toBe('Zeile\n## Text')
  })
})