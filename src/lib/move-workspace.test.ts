import { describe, expect, it } from 'vitest'
import {
  expandFsidxFileDrag,
  moveDirectoryValidationError,
  moveFileValidationError,
  normalizeRenameFileNameInput,
  pathIsUnderDir,
  remapSubtreePath,
  renameFileValidationError,
  resolveMoveDirectoryPath,
  resolveMoveFilePath,
  resolveRenameFilePath,
} from './move-workspace'

describe('resolveMoveDirectoryPath', () => {
  it('legt Ordner im Ziel an', () => {
    expect(resolveMoveDirectoryPath('a/b', 'x')).toBe('x/b')
    expect(resolveMoveDirectoryPath('proj', '')).toBe('proj')
  })
})

describe('moveDirectoryValidationError', () => {
  it('verhindert Verschieben in Unterordner', () => {
    expect(moveDirectoryValidationError('a/b', 'a/b/c', new Set())).toMatch(/Unterordner/)
    expect(moveDirectoryValidationError('a/b', 'x', new Set())).toBeNull()
  })
})

describe('remapSubtreePath', () => {
  it('ersetzt Präfix', () => {
    expect(remapSubtreePath('old', 'new', 'old/x/y')).toBe('new/x/y')
    expect(remapSubtreePath('old', 'new', 'old')).toBe('new')
  })
})

describe('pathIsUnderDir', () => {
  it('erkennt Nachfahren', () => {
    expect(pathIsUnderDir('a', 'a/b')).toBe(true)
    expect(pathIsUnderDir('a', 'b/a')).toBe(false)
  })
})

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

describe('expandFsidxFileDrag', () => {
  it('expandiert Mehrfach-Payload ohne Duplikate', () => {
    const json = JSON.stringify({
      path: 'a/one.md',
      id: '1',
      name: 'one.md',
      kind: 'file',
      batch: [
        { path: 'a/two.md', id: '2', name: 'two.md', kind: 'file' },
        { path: 'a/one.md', id: '1', name: 'one.md', kind: 'file' },
      ],
    })
    const items = expandFsidxFileDrag(json)
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.path)).toEqual(['a/one.md', 'a/two.md'])
  })
})