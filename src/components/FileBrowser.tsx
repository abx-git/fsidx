import { Folder, File, FileJson, ListTodo } from 'lucide-react'
import { isTskJsonPath } from '../lib/et2/tsk-paths'
import type { IndexEntry, IndexNode } from '../types'
import { formatBytes, formatDate } from '../lib/format'
import { defaultViewerForFile } from '../lib/file-viewers'
import type { FileViewerKind } from '../lib/file-viewers'
import { isSidecarForIndexedFile } from '../lib/sidecar'
import { isEt2InternalPath } from '../lib/et2/is-et2-internal'
import { isHiddenEt2Scope } from '../lib/scope-sanitize'
import { ScopeBar } from './ScopeBar'
import { ScopeCreateActions } from './ScopeCreateActions'
import { fsidxFileDragMime } from '../lib/move-workspace'
import type { ContextMenuTarget } from './FileContextMenu'

interface FileBrowserProps {
  rootName: string
  currentNode: IndexNode | null
  onNavigate: (path: string) => void
  onSelectEntry: (id: string) => void
  selectedId: string | null
  searchQuery: string
  searchResults: IndexEntry[]
  searchTasksOnly?: boolean
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
  showEt2DotFiles?: boolean
  scopePath: string
  canWrite: boolean
  onNewFolder: () => void
  onNewMarkdown: () => void
  onNewTskFile?: () => void
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
  onNavigate,
  onSelectEntry,
  selectedId,
  searchQuery,
  searchResults,
  searchTasksOnly = false,
  indexedFilePaths,
  hasSidecar,
  onOpenViewer,
  onFileContextMenu,
  showEt2DotFiles = false,
  scopePath,
  canWrite,
  onNewFolder,
  onNewMarkdown,
  onNewTskFile,
}: FileBrowserProps) {
  const inSearch = searchQuery.trim().length > 0

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
  ).filter((row) => {
    if (row.kind === 'directory') return true
    if (isSidecarForIndexedFile(row.path, indexedFilePaths)) return false
    if (isEt2InternalPath(row.path, showEt2DotFiles)) return false
    return true
  })

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {!inSearch && (
        <ScopeBar
          workspaceRootName={rootName}
          scopePath={scopePath}
          onSelectScope={onNavigate}
        />
      )}
      <div className="shrink-0">
        {!inSearch && (
          <ScopeCreateActions
            canWrite={canWrite}
            onNewFolder={onNewFolder}
            onNewMarkdown={onNewMarkdown}
            onNewTskFile={onNewTskFile}
          />
        )}
        {inSearch && (
          <>
            <ScopeBar
              workspaceRootName={rootName}
              scopePath={scopePath}
              onSelectScope={onNavigate}
              variant="compact"
            />
            <p className="border-b border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {searchResults.length} Treffer für &quot;{searchQuery}&quot;
              {searchTasksOnly ? ' (nur Aufgaben)' : ''} · Scope: aktueller Ordner
            </p>
          </>
        )}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {listing.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-zinc-500">
            {inSearch
              ? 'Keine Treffer.'
              : isHiddenEt2Scope(scopePath, showEt2DotFiles)
                ? 'Legacy-Systemordner (.et2) — in der Scope-Leiste einen Ordner darüber wählen oder *.tsk.json anlegen.'
                : 'Keine Einträge. Oben „Aufgaben-Datei“ oder Ordner anlegen.'}
          </li>
        )}
        {listing.map((row) => {
          const isSelected = selectedId === row.id
          const meta = row.kind === 'file' && hasSidecar(row.path)
          return (
            <li key={row.id}>
              <button
                type="button"
                draggable={canWrite && row.kind === 'file'}
                onDragStart={(e) => {
                  if (!canWrite || row.kind !== 'file') return
                  e.dataTransfer.setData(
                    fsidxFileDragMime(),
                    JSON.stringify({ path: row.path, id: row.id, name: row.name }),
                  )
                  e.dataTransfer.effectAllowed = 'move'
                }}
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
                  if (isTskJsonPath(row.path)) return
                  const kind = defaultViewerForFile(row.path, row.extension)
                  onOpenViewer(kind, row.path, row.name, row.id, row.size)
                }}
                onContextMenu={(e) => {
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
                  ) : isTskJsonPath(row.path) ? (
                    <ListTodo className="h-4 w-4 shrink-0 text-violet-500" />
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