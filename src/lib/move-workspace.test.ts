import { describe, expect, it } from 'vitest'
import {
  moveFileValidationError,
  normalizeRenameFileNameInput,
  renameFileValidationError,
  resolveMoveFilePath,
  resolveRenameFilePath,
} from './move-workspace'

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

describe('resolveRenameFilePath', () => {
  it('ändert nur den Dateinamen im gleichen Ordner', () => {
    expect(resolveRenameFilePath('proj/Sprint.tsk.json', 'Backlog.tsk.json')).toBe(
      'proj/Backlog.tsk.json',
    )
    expect(resolveRenameFilePath('root.tsk.json', 'neu.tsk.json')).toBe('neu.tsk.json')
  })
})

describe('normalizeRenameFileNameInput', () => {
  it('nimmt nur den Dateinamen', () => {
    expect(normalizeRenameFileNameInput('  notiz.md  ')).toBe('notiz.md')
    expect(normalizeRenameFileNameInput('ordner/notes.txt')).toBe('notes.txt')
  })

  it('lehnt leere oder ungültige Namen ab', () => {
    expect(() => normalizeRenameFileNameInput('')).toThrow()
    expect(() => normalizeRenameFileNameInput('bad:name.md')).toThrow()
  })
})

describe('renameFileValidationError', () => {
  it('meldet Namenskollision', () => {
    const paths = new Set(['a/x.tsk.json'])
    expect(renameFileValidationError('a/y.tsk.json', 'x.tsk.json', paths)).toMatch(/bereits/)
  })
})