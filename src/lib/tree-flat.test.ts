import { describe, expect, it } from 'vitest'
import type { IndexNode } from '../types'
import { flattenVisibleTree } from './tree-flat'

function dir(path: string, depth: number, children: IndexNode[] = []): IndexNode {
  const name = path ? path.split('/').pop()! : 'root'
  return {
    id: path || 'root',
    kind: 'directory',
    name,
    path,
    depth,
    children,
  }
}

describe('flattenVisibleTree', () => {
  it('listet leere Unterordner im Baum', () => {
    const root = dir('', 0, [dir('leer', 1, []), dir('mit', 1, [dir('mit/sub', 2, [])])])
    const entries = [
      { id: 'leer', kind: 'directory' as const, name: 'leer', path: 'leer', parentPath: '', depth: 1, searchText: '' },
      { id: 'mit', kind: 'directory' as const, name: 'mit', path: 'mit', parentPath: '', depth: 1, searchText: '' },
      { id: 'sub', kind: 'directory' as const, name: 'sub', path: 'mit/sub', parentPath: 'mit', depth: 2, searchText: '' },
    ]
    const rows = flattenVisibleTree(root, entries, new Set(['', 'mit']), true)
    const paths = rows.map((r) => r.path)
    expect(paths).toContain('leer')
    expect(paths).toContain('mit')
    expect(paths).toContain('mit/sub')
  })
})