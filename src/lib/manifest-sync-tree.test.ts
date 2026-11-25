import { describe, expect, it } from 'vitest'
import type { FileIndexManifest, IndexEntry } from '../types'
import { findNodeByPath } from './build-manifest'
import { rebuildManifestTreeFromEntries } from './manifest-sync-tree'
import { childEntriesAt, groupEntriesByParent, pathDepth } from './manifest-children'

function dir(id: string, path: string, parentPath: string, depth: number): IndexEntry {
  const name = path.split('/').pop() ?? 'root'
  return { id, kind: 'directory', name, path, parentPath, depth, searchText: name }
}

describe('pathDepth', () => {
  it('zählt Pfadsegmente für Baumeinrückung', () => {
    expect(pathDepth('')).toBe(0)
    expect(pathDepth('Themen')).toBe(1)
    expect(pathDepth('Themen/Fliegen/HAC')).toBe(3)
  })
})

describe('rebuildManifestTreeFromEntries', () => {
  it('hält tree.children mit entries unter demselben Elternpfad synchron', () => {
    const manifest: FileIndexManifest = {
      version: 1,
      indexedAt: '2025-01-01',
      rootName: 'Notes',
      stats: { files: 0, directories: 3, totalBytes: 0, maxDepth: 2 },
      tree: {
        id: 'root',
        kind: 'directory',
        name: 'Notes',
        path: '',
        depth: 0,
        children: [
          {
            id: 'stale-fliegen',
            kind: 'directory',
            name: 'Fliegen',
            path: 'Themen/Fliegen',
            depth: 2,
            children: [
              {
                id: 'stale-hac',
                kind: 'directory',
                name: 'HAC',
                path: 'Themen/Fliegen/HAC',
                depth: 3,
                children: [],
              },
            ],
          },
        ],
      },
      entries: [
        dir('t1', 'Themen', '', 1),
        dir('f1', 'Themen/Fliegen', 'Themen', 2),
        dir('b1', 'Themen/Fliegen/Breezer', 'Themen/Fliegen', 3),
        dir('h1', 'Themen/Fliegen/HK36', 'Themen/Fliegen', 3),
      ],
    }
    const rebuilt = rebuildManifestTreeFromEntries(manifest)
    const byParent = groupEntriesByParent(manifest.entries)
    const fromEntries = childEntriesAt(byParent, 'Themen/Fliegen').map((e) => e.name).sort()
    const fliegen = findNodeByPath(rebuilt.tree, 'Themen/Fliegen')
    const fromTree = (fliegen?.children ?? []).map((c) => c.name).sort()
    expect(fromEntries).toEqual(['Breezer', 'HK36'])
    expect(fromTree).toEqual(fromEntries)
  })
})