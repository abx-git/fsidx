import { Bookmark, Star, X } from 'lucide-react'
import type { WorkspaceBookmark } from '../lib/bookmarks'

interface BookmarksStripProps {
  bookmarks: WorkspaceBookmark[]
  scopePath: string
  selectedPath?: string | null
  scopeBookmarked: boolean
  onToggleScopeBookmark: () => void
  onActivate: (bookmark: WorkspaceBookmark) => void
  onRemove: (id: string) => void
}

function isActive(bookmark: WorkspaceBookmark, scopePath: string, selectedPath: string | null): boolean {
  const scope = scopePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const sel = selectedPath?.replace(/\\/g, '/').replace(/^\/+/, '') ?? ''
  if (bookmark.kind === 'file') return sel === bookmark.path
  return scope === bookmark.path
}

export function BookmarksStrip({
  bookmarks,
  scopePath,
  selectedPath = null,
  scopeBookmarked,
  onToggleScopeBookmark,
  onActivate,
  onRemove,
}: BookmarksStripProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={onToggleScopeBookmark}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
            scopeBookmarked
              ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
              : 'border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
          }`}
          title="Aktuellen Scope als Lesezeichen speichern"
        >
          <Star className={`h-3 w-3 ${scopeBookmarked ? 'fill-current' : ''}`} aria-hidden />
          Scope merken
        </button>
        <span className="text-[10px] text-zinc-400">Noch keine Lesezeichen</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800/80">
      <Bookmark className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain py-0.5">
        <button
          type="button"
          onClick={onToggleScopeBookmark}
          className={`shrink-0 inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
            scopeBookmarked
              ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40'
              : 'border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900'
          }`}
          title={scopeBookmarked ? 'Scope-Lesezeichen entfernen' : 'Aktuellen Scope merken'}
          aria-label="Scope-Lesezeichen"
        >
          <Star className={`h-3 w-3 ${scopeBookmarked ? 'fill-current' : ''}`} />
        </button>
        {bookmarks.map((b) => {
          const active = isActive(b, scopePath, selectedPath)
          return (
            <span key={b.id} className="group relative shrink-0">
              <button
                type="button"
                onClick={() => onActivate(b)}
                className={`max-w-[11rem] truncate rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                  active
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
                }`}
                title={b.path ? `${b.kind}: ${b.path}` : `Scope: Stamm`}
              >
                {b.label}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(b.id)
                }}
                className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow group-hover:flex dark:border-zinc-600 dark:bg-zinc-800"
                aria-label={`Lesezeichen „${b.label}“ entfernen`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}