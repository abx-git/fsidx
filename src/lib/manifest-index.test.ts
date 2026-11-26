import { describe, expect, it } from 'vitest'
import type { IndexEntry } from '../types'
import { buildManifestIndexes, collectEntriesInScope } from './manifest-index'

function entry(partial: Partial<IndexEntry> & Pick<IndexEntry, 'id' | 'path' | 'kind' | 'name'>): IndexEntry {
  const parentPath = partial.path.includes('/')
    ? partial.path.replace(/\/[^/]+$/, '')
    : ''
  return {
    parentPath,
    depth: partial.path.split('/').filter(Boolean).length,
    searchText: partial.name.toLowerCase(),
    ...partial,
  }
}

describe('manifest-index', () => {
  it('gruppiert Kinder und findet Scope-Teilbaum', () => {
    const entries: IndexEntry[] = [
      entry({ id: '1', path: 'docs', kind: 'directory', name: 'docs' }),
      entry({ id: '2', path: 'docs/a.md', kind: 'file', name: 'a.md' }),
      entry({ id: '3', path: 'docs/sub', kind: 'directory', name: 'sub' }),
      entry({ id: '4', path: 'docs/sub/b.md', kind: 'file', name: 'b.md' }),
    ]
    const idx = buildManifestIndexes(entries)
    expect(idx.byPath.get('docs/sub/b.md')?.kind).toBe('file')
    expect(idx.filePaths.has('docs/a.md')).toBe(true)

    const scoped = collectEntriesInScope(idx.byParent, 'docs')
    expect(scoped.map((e) => e.path).sort()).toEqual(['docs/a.md', 'docs/sub', 'docs/sub/b.md'])
  })
})