import { Folder, File, FileJson } from 'lucide-react'
import type { IndexEntry, IndexNode } from '../types'
import { formatBytes, formatDate } from '../lib/format'
import { defaultViewerForFile } from '../lib/file-viewers'
import type { FileViewerKind } from '../lib/file-viewers'
import { isSidecarForIndexedFile } from '../lib/sidecar'
import { pathBreadcrumbs } from './TreeNav'
import type { ContextMenuTarget } from './FileContextMenu'

interface FileBrowserProps {
  rootName: string
  currentNode: IndexNode | null
  currentPath: string
  onNavigate: (path: string) => void
  onSelectEntry: (id: string) => void
  selectedId: string | null
  searchQuery: string
  searchResults: IndexEntry[]
  indexedFilePaths: Set<string>
  hasSidecar: (filePath: string) => boolean
  onOpenViewer: (
    kind: FileViewerKind,
    path: string,
    name: string,
    id: string,
    size?: number,
  ) => void
  onFileContextMenu: (target: ContextMenuTarget) => void
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
  indexedFilePaths,
  hasSidecar,
  onOpenViewer,
  onFileContextMenu,
}: FileBrowserProps) {
  const inSearch = searchQuery.trim().length > 0
  const crumbs = pathBreadcrumbs(currentPath, rootName)

  const listing: Row[] = (inSearch
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
  ).filter(
    (row) =>
      row.kind === 'directory' || !isSidecarForIndexedFile(row.path, indexedFilePaths),
  )

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
          {searchResults.length} Treffer für &quot;{searchQuery}&quot;
        </p>
      )}
      <p className="border-b border-zinc-100 px-3 py-1 text-[11px] text-zinc-400 dark:border-zinc-800">
        Rechtsklick: Viewer nach Dateityp · Metadaten als <code className="text-[10px]">datei.json</code>
      </p>
      <ul className="min-h-0 flex-1 overflow-auto">
        {listing.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-zinc-500">
            {inSearch ? 'Keine Treffer.' : 'Dieser Ordner ist leer.'}
          </li>
        )}
        {listing.map((row) => {
          const isSelected = selectedId === row.id
          const meta = row.kind === 'file' && hasSidecar(row.path)
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
                  onSelectEntry(row.id)
                  const kind = defaultViewerForFile(row.path, row.extension)
                  onOpenViewer(kind, row.path, row.name, row.id, row.size)
                }}
                onContextMenu={(e) => {
                  if (row.kind !== 'file') return
                  e.preventDefault()
                  onFileContextMenu({
                    id: row.id,
                    path: row.path,
                    name: row.name,
                    kind: row.kind,
                    extension: row.extension,
                    x: e.clientX,
                    y: e.clientY,
                  })
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
                  {meta && (
                    <span title="Metadaten-JSON vorhanden" className="inline-flex">
                      <FileJson className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                    </span>
                  )}
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