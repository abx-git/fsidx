import { describe, expect, it } from 'vitest'
import {
  bookmarkMatchesPath,
  defaultBookmarkLabel,
  findBookmarkByPath,
  type WorkspaceBookmark,
} from './bookmarks'

describe('bookmarks', () => {
  it('erzeugt Standard-Label', () => {
    expect(defaultBookmarkLabel('', 'Projekt', 'scope')).toBe('Projekt')
    expect(defaultBookmarkLabel('a/b/file.md', 'Projekt', 'file')).toBe('file.md')
  })

  it('findet Lesezeichen nach Pfad', () => {
    const list: WorkspaceBookmark[] = [
      { id: '1', path: 'foo', kind: 'scope', label: 'Foo', createdAt: 0 },
    ]
    expect(findBookmarkByPath(list, 'foo', 'scope')).toBeDefined()
    expect(bookmarkMatchesPath(list[0], 'foo', 'scope')).toBe(true)
    expect(findBookmarkByPath(list, 'foo', 'file')).toBeUndefined()
  })
})