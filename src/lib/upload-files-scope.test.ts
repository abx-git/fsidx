import { describe, expect, it } from 'vitest'

import { pathsForDroppedFiles } from './upload-files-scope'

describe('upload-files-scope', () => {
  it('maps flat files into current scope', () => {
    const f = new File(['x'], 'note.md', { type: 'text/plain' })
    expect(pathsForDroppedFiles('docs', [f])).toEqual(['docs/note.md'])
  })

  it('honors webkitRelativePath for folder drops', () => {
    const f = new File(['x'], 'inner.txt', { type: 'text/plain' })
    Object.defineProperty(f, 'webkitRelativePath', { value: 'batch/inner.txt' })
    expect(pathsForDroppedFiles('proj', [f])).toEqual(['proj/batch/inner.txt'])
  })

  it('rejects parent traversal', () => {
    const f = new File(['x'], 'evil.txt', { type: 'text/plain' })
    Object.defineProperty(f, 'webkitRelativePath', { value: '../evil.txt' })
    expect(() => pathsForDroppedFiles('', [f])).toThrow()
  })
})