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
    const rows = flattenVisibleTree(root, new Set(['', 'mit']), true)
    const paths = rows.map((r) => r.path)
    expect(paths).toContain('leer')
    expect(paths).toContain('mit')
    expect(paths).toContain('mit/sub')
  })
})