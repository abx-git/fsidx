import { describe, expect, it } from 'vitest'
import { moveFileValidationError, resolveMoveFilePath } from './move-workspace'

describe('resolveMoveFilePath', () => {
  it('legt Datei im Zielordner an', () => {
    expect(resolveMoveFilePath('a/note.md', 'b/c')).toBe('b/c/note.md')
    expect(resolveMoveFilePath('note.md', 'inbox')).toBe('inbox/note.md')
    expect(resolveMoveFilePath('x/y.md', '')).toBe('y.md')
  })
})

describe('moveFileValidationError', () => {
  it('meldet Namenskollision', () => {
    const paths = new Set(['dest/a.md'])
    expect(moveFileValidationError('src/a.md', 'dest', paths)).toMatch(/bereits/)
  })

  it('erlaubt Verschieben in leeren Zielordner', () => {
    expect(moveFileValidationError('src/a.md', 'dest', new Set())).toBeNull()
  })
})