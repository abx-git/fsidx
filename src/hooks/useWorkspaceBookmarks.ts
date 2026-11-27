import { useCallback, useEffect, useState } from 'react'
import {
  defaultBookmarkLabel,
  findBookmarkByPath,
  readWorkspaceBookmarks,
  writeWorkspaceBookmarks,
  type BookmarkKind,
  type WorkspaceBookmark,
} from '../lib/bookmarks'

export function useWorkspaceBookmarks(workspaceRootName: string | undefined) {
  const [bookmarks, setBookmarks] = useState<WorkspaceBookmark[]>(() =>
    workspaceRootName ? readWorkspaceBookmarks(workspaceRootName) : [],
  )

  useEffect(() => {
    setBookmarks(workspaceRootName ? readWorkspaceBookmarks(workspaceRootName) : [])
  }, [workspaceRootName])

  const persist = useCallback(
    (next: WorkspaceBookmark[]) => {
      setBookmarks(next)
      if (workspaceRootName) writeWorkspaceBookmarks(workspaceRootName, next)
    },
    [workspaceRootName],
  )

  const addBookmark = useCallback(
    (path: string, kind: BookmarkKind, label?: string) => {
      if (!workspaceRootName) return
      const norm = path.replace(/\\/g, '/').replace(/^\/+/, '')
      if (findBookmarkByPath(bookmarks, norm, kind)) return
      const entry: WorkspaceBookmark = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        path: norm,
        kind,
        label: label?.trim() || defaultBookmarkLabel(norm, workspaceRootName, kind),
        createdAt: Date.now(),
      }
      persist([entry, ...bookmarks].slice(0, 32))
    },
    [bookmarks, persist, workspaceRootName],
  )

  const removeBookmark = useCallback(
    (id: string) => {
      persist(bookmarks.filter((b) => b.id !== id))
    },
    [bookmarks, persist],
  )

  const toggleBookmark = useCallback(
    (path: string, kind: BookmarkKind, label?: string) => {
      const norm = path.replace(/\\/g, '/').replace(/^\/+/, '')
      const existing = findBookmarkByPath(bookmarks, norm, kind)
      if (existing) removeBookmark(existing.id)
      else addBookmark(norm, kind, label)
    },
    [addBookmark, bookmarks, removeBookmark],
  )

  const isBookmarked = useCallback(
    (path: string, kind: BookmarkKind) => Boolean(findBookmarkByPath(bookmarks, path, kind)),
    [bookmarks],
  )

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
  }
}