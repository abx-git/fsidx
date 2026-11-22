import { Folder, File } from 'lucide-react'
import type { IndexEntry, IndexNode } from '../types'
import { formatBytes, formatDate } from '../lib/format'
import { pathBreadcrumbs } from './TreeNav'

interface FileBrowserProps {
  rootName: string
  currentNode: IndexNode | null
  currentPath: string
  onNavigate: (path: string) => void
  onSelectEntry: (id: string) => void
  selectedId: string | null
  searchQuery: string
  searchResults: IndexEntry[]
  onOpenMarkdown?: (path: string, id: string) => void
}

type Row = {
  id: string
  kind: 'file' | 'directory'
  name: string
  path: string
  size?: number
  lastModified?: number
  extension?: string
}

export function FileBrowser({
  rootName,
  currentNode,
  currentPath,
  onNavigate,
  onSelectEntry,
  selectedId,
  searchQuery,
  searchResults,
  onOpenMarkdown,
}: FileBrowserProps) {
  const inSearch = searchQuery.trim().length > 0
  const crumbs = pathBreadcrumbs(currentPath, rootName)

  const listing: Row[] = inSearch
    ? searchResults.map((e) => ({
        id: e.id,
        kind: e.kind,
        name: e.name,
        path: e.path,
        size: e.size,
        lastModified: e.lastModified,
        extension: e.extension,
      }))
    : (currentNode?.children ?? []).map((child) => ({
        id: child.id,
        kind: child.kind,
        name: child.name,
        path: child.path,
        size: child.size,
        lastModified: child.lastModified,
        extension: child.extension,
      }))

  return (
    <section className="flex h-full min-h-0 flex-col">
      {!inSearch && (
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
          {crumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <span className="text-zinc-400">/</span>}
              <button
                type="button"
                onClick={() => onNavigate(crumb.path)}
                className="rounded px-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </div>
      )}
      {inSearch && (
        <p className="border-b border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {searchResults.length} match{searchResults.length === 1 ? '' : 'es'} for &quot;{searchQuery}&quot;
        </p>
      )}
      <ul className="min-h-0 flex-1 overflow-auto">
        {listing.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-zinc-500">
            {inSearch ? 'No results in this index.' : 'This folder is empty.'}
          </li>
        )}
        {listing.map((row) => {
          const isSelected = selectedId === row.id
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectEntry(row.id)
                  if (row.kind === 'directory' && !inSearch) onNavigate(row.path)
                }}
                onDoubleClick={() => {
                  if (row.kind === 'directory') {
                    onNavigate(row.path)
                    return
                  }
                  const ext = row.extension ?? row.name.split('.').pop()?.toLowerCase()
                  if (ext === 'md' || ext === 'markdown') {
                    onSelectEntry(row.id)
                    onOpenMarkdown?.(row.path, row.id)
                  }
                }}
                className={`grid w-full grid-cols-[1fr_auto_auto] gap-3 border-b border-zinc-100 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-900 ${
                  isSelected ? 'bg-emerald-50/80 dark:bg-emerald-950/30' : ''
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {row.kind === 'directory' ? (
                    <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <File className="h-4 w-4 shrink-0 text-sky-500" />
                  )}
                  <span className="truncate font-medium text-zinc-800 dark:text-zinc-100">{row.name}</span>
                  {inSearch && (
                    <span className="truncate text-xs text-zinc-400">{row.path}</span>
                  )}
                </span>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {row.kind === 'file' ? formatBytes(row.size ?? 0) : '—'}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatDate(row.lastModified)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}