export type BookmarkKind = 'scope' | 'file'

export interface WorkspaceBookmark {
  id: string
  /** POSIX-Pfad relativ zum Workspace-Stamm (`''` = Stamm). */
  path: string
  kind: BookmarkKind
  label: string
  createdAt: number
}

const STORAGE_PREFIX = 'fsidx.bookmarks.v1:'

function storageKey(workspaceRootName: string): string {
  return `${STORAGE_PREFIX}${workspaceRootName}`
}

export function readWorkspaceBookmarks(workspaceRootName: string): WorkspaceBookmark[] {
  if (!workspaceRootName) return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceRootName))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((b): b is WorkspaceBookmark => {
        if (!b || typeof b !== 'object') return false
        const x = b as WorkspaceBookmark
        return (
          typeof x.id === 'string' &&
          typeof x.path === 'string' &&
          (x.kind === 'scope' || x.kind === 'file') &&
          typeof x.label === 'string'
        )
      })
      .slice(0, 32)
  } catch {
    return []
  }
}

export function writeWorkspaceBookmarks(
  workspaceRootName: string,
  bookmarks: WorkspaceBookmark[],
): void {
  if (!workspaceRootName) return
  try {
    localStorage.setItem(storageKey(workspaceRootName), JSON.stringify(bookmarks.slice(0, 32)))
  } catch {
    /* ignore */
  }
}

export function defaultBookmarkLabel(path: string, workspaceRootName: string, kind: BookmarkKind): string {
  const norm = path.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!norm) return workspaceRootName || 'Workspace'
  if (kind === 'file') return norm.split('/').pop() ?? norm
  return norm.split('/').pop() ?? norm
}

export function bookmarkMatchesPath(bookmark: WorkspaceBookmark, path: string, kind: BookmarkKind): boolean {
  const a = path.replace(/\\/g, '/').replace(/^\/+/, '')
  const b = bookmark.path.replace(/\\/g, '/').replace(/^\/+/, '')
  return bookmark.kind === kind && a === b
}

export function findBookmarkByPath(
  bookmarks: WorkspaceBookmark[],
  path: string,
  kind: BookmarkKind,
): WorkspaceBookmark | undefined {
  return bookmarks.find((b) => bookmarkMatchesPath(b, path, kind))
}