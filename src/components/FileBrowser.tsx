import { useCallback, useMemo, useRef, useState } from 'react'
import { Folder, File, FileJson, LayoutGrid, Link2, ListTodo, Lock, PenLine, Shield, Upload } from 'lucide-react'
import { isDrawioPath } from '../lib/drawio'
import { isE2JsonPath } from '../lib/e2/e2-board-paths'
import { isTskJsonPath } from '../lib/et2/tsk-paths'
import { isLinkJsonPath } from '../lib/link/link-paths'
import type { IndexEntry } from '../types'
import { childEntriesAt, groupEntriesByParent } from '../lib/manifest-children'
import { formatBytes, formatDate } from '../lib/format'
import { defaultViewerForFile } from '../lib/file-viewers'
import type { FileViewerKind } from '../lib/file-viewers'
import { isSidecarForIndexedFile } from '../lib/sidecar'
import { isEt2InternalPath } from '../lib/et2/is-et2-internal'
import { shouldShowDirectoryInTree } from '../lib/tree-display-filter'
import { isHiddenEt2Scope } from '../lib/scope-sanitize'
import { ScopeBar } from './ScopeBar'
import { BookmarksStrip } from './BookmarksStrip'
import type { WorkspaceBookmark } from '../lib/bookmarks'
import { ScopeCreateActions } from './ScopeCreateActions'
import { VirtualList } from './ui/VirtualList'
import { fsidxFileDragMime } from '../lib/move-workspace'
import type { ContextMenuTarget } from './FileContextMenu'
import { scopeVaultRoot, shouldHideFromFileList } from '../lib/vault/vault-paths'
import { getVaultOpaqueOnDiskCount, isVaultUnlocked } from '../lib/vault/vault-session'

interface FileBrowserProps {
  rootName: string
  entries: IndexEntry[]
  entriesByParent?: Map<string, IndexEntry[]>
  onNavigate: (path: string) => void
  onSelectEntry: (id: string, event?: React.MouseEvent, orderedIds?: string[]) => void
  selectedId: string | null
  selectedIds?: ReadonlySet<string>
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
  onNewLinkFile?: () => void
  onNewDrawioFile?: () => void
  onNewE2Board?: () => void
  onNewVaultFolder?: () => void
  vaultRoots?: string[]
  onUnlockVault?: (vaultRoot: string) => void
  onLockVault?: (vaultRoot: string) => void
  onUploadFiles?: (files: File[]) => void
  onRefreshScope?: () => void
  refreshingScope?: boolean
  bookmarks?: WorkspaceBookmark[]
  selectedEntryPath?: string | null
  scopeBookmarked?: boolean
  onToggleScopeBookmark?: () => void
  onBookmarkActivate?: (bookmark: WorkspaceBookmark) => void
  onBookmarkRemove?: (id: string) => void
}

const VIRTUAL_LIST_MIN = 80

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
  entries,
  entriesByParent: entriesByParentProp,
  onNavigate,
  onSelectEntry,
  selectedId,
  selectedIds,
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
  onNewLinkFile,
  onNewDrawioFile,
  onNewE2Board,
  onNewVaultFolder,
  vaultRoots = [],
  onUnlockVault,
  onLockVault,
  onUploadFiles,
  onRefreshScope,
  refreshingScope = false,
  bookmarks = [],
  selectedEntryPath = null,
  scopeBookmarked = false,
  onToggleScopeBookmark,
  onBookmarkActivate,
  onBookmarkRemove,
}: FileBrowserProps) {
  const [fileDropActive, setFileDropActive] = useState(false)
  const fileDropDepth = useRef(0)
  const entriesByParentFallback = useMemo(() => groupEntriesByParent(entries), [entries])
  const entriesByParent = entriesByParentProp ?? entriesByParentFallback
  const inSearch = searchQuery.trim().length > 0
  const activeVaultRoot = scopeVaultRoot(scopePath, vaultRoots)
  const workspaceIsVault = vaultRoots.includes('')
  const vaultRootKey = workspaceIsVault ? '' : activeVaultRoot ?? ''
  const inVaultScope = workspaceIsVault || activeVaultRoot !== null
  const scopeVaultLocked = inVaultScope && !isVaultUnlocked(vaultRootKey)
  const scopeVaultOpen = inVaultScope && isVaultUnlocked(vaultRootKey)

  const isExternalFileDrag = useCallback((dt: DataTransfer) => {
    if (!dt.types.includes('Files')) return false
    return !dt.types.includes(fsidxFileDragMime())
  }, [])

  const onFileListDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!canWrite || !onUploadFiles || inSearch) return
      if (scopeVaultLocked) return
      if (!isExternalFileDrag(e.dataTransfer)) return
      e.preventDefault()
      fileDropDepth.current += 1
      setFileDropActive(true)
    },
    [canWrite, inSearch, isExternalFileDrag, onUploadFiles, scopeVaultLocked],
  )

  const onFileListDragLeave = useCallback((e: React.DragEvent) => {
    if (!fileDropActive) return
    e.preventDefault()
    fileDropDepth.current -= 1
    if (fileDropDepth.current <= 0) {
      fileDropDepth.current = 0
      setFileDropActive(false)
    }
  }, [fileDropActive])

  const onFileListDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canWrite || !onUploadFiles || inSearch || scopeVaultLocked) return
      if (!isExternalFileDrag(e.dataTransfer)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    [canWrite, inSearch, isExternalFileDrag, onUploadFiles, scopeVaultLocked],
  )

  const onFileListDrop = useCallback(
    (e: React.DragEvent) => {
      fileDropDepth.current = 0
      setFileDropActive(false)
      if (!canWrite || !onUploadFiles || inSearch || scopeVaultLocked) return
      if (!isExternalFileDrag(e.dataTransfer)) return
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) onUploadFiles(files)
    },
    [canWrite, inSearch, onUploadFiles, scopeVaultLocked, isExternalFileDrag],
  )

  const onFileListContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (inSearch || scopeVaultLocked) return
      const target = e.target as HTMLElement
      if (target.closest('button[type="button"]')) return
      e.preventDefault()
      const dirAtScope = entries.find((e) => e.kind === 'directory' && e.path === scopePath)
      const scopeName = scopePath ? scopePath.split('/').pop() ?? scopePath : rootName
      onFileContextMenu({
        id: dirAtScope?.id ?? `scope:${scopePath}`,
        path: scopePath,
        name: scopeName,
        kind: 'directory',
        x: e.clientX,
        y: e.clientY,
      })
    },
    [entries, inSearch, onFileContextMenu, rootName, scopePath, scopeVaultLocked],
  )

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
    : childEntriesAt(entriesByParent, scopePath).map((child) => ({
        id: child.id,
        kind: child.kind,
        name: child.name,
        path: child.path,
        size: child.size,
        lastModified: child.lastModified,
        extension: child.extension,
      }))
  ).filter((row) => {
    if (row.kind === 'directory') {
      return shouldShowDirectoryInTree(row.path, showEt2DotFiles)
    }
    if (isSidecarForIndexedFile(row.path, indexedFilePaths)) return false
    if (isEt2InternalPath(row.path, showEt2DotFiles)) return false
    if (shouldHideFromFileList(row.path)) return false
    if (row.kind === 'file' && scopeVaultLocked) {
      if (workspaceIsVault || (activeVaultRoot && row.path.startsWith(`${activeVaultRoot}/`))) return false
    }
    return true
  })

  const useVirtualList = !inSearch && listing.length >= VIRTUAL_LIST_MIN
  const listSurfaceClass = `relative min-h-0 flex-1 overflow-hidden flex flex-col ${
    fileDropActive
      ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
      : ''
  }`

  const emptyListing = (
    <div className="px-4 py-8 text-center text-sm text-zinc-500">
      {inSearch
        ? 'Keine Treffer.'
        : isHiddenEt2Scope(scopePath, showEt2DotFiles)
          ? 'Legacy-Systemordner (.et2) — in der Scope-Leiste einen Ordner darüber wählen oder *.tsk.json anlegen.'
          : canWrite && onUploadFiles && !scopeVaultLocked
            ? 'Keine Einträge. Dateien hierher ziehen oder oben anlegen.'
            : 'Keine Einträge. Oben „Aufgaben-Datei“ oder Ordner anlegen.'}
    </div>
  )

  const renderListingRow = useCallback(
    (row: Row) => {
      const isSelected = selectedIds?.has(row.id) ?? selectedId === row.id
      const isPrimary = selectedId === row.id
      const meta = row.kind === 'file' && hasSidecar(row.path)
      return (
        <button
          type="button"
          draggable={canWrite}
          onDragStart={(e) => {
            if (!canWrite) return
            const dragRows =
              selectedIds && selectedIds.has(row.id) && selectedIds.size > 1
                ? listing.filter((r) => selectedIds.has(r.id))
                : [row]
            const batch =
              dragRows.length > 1
                ? dragRows.map((r) => ({
                    path: r.path,
                    id: r.id,
                    name: r.name,
                    kind: r.kind,
                  }))
                : undefined
            e.dataTransfer.setData(
              fsidxFileDragMime(),
              JSON.stringify({
                path: row.path,
                id: row.id,
                name: row.name,
                kind: row.kind,
                batch,
              }),
            )
            e.dataTransfer.effectAllowed = 'move'
          }}
          onClick={(e) => {
            const ordered = listing.map((r) => r.id)
            onSelectEntry(row.id, e, ordered)
            if (row.kind === 'directory' && !inSearch && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              onNavigate(row.path)
            }
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
            e.stopPropagation()
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
          className={`grid w-full grid-cols-[1fr_auto_auto] gap-3 border-b px-3 py-2 text-left text-sm dark:border-zinc-800/80 ${
            row.kind === 'directory' && vaultRoots.includes(row.path)
              ? 'border-blue-200/80 bg-blue-50/40 hover:bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/25'
              : 'border-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          } ${
            isSelected
              ? isPrimary
                ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-400/60 dark:bg-emerald-950/30 dark:ring-emerald-600/50'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20'
              : ''
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {row.kind === 'directory' && vaultRoots.includes(row.path) ? (
              <Shield className="h-4 w-4 shrink-0 text-blue-800" />
            ) : row.kind === 'directory' ? (
              <Folder className="h-4 w-4 shrink-0 text-amber-500" />
            ) : isTskJsonPath(row.path) ? (
              <ListTodo className="h-4 w-4 shrink-0 text-blue-700" />
            ) : isLinkJsonPath(row.path) ? (
              <Link2 className="h-4 w-4 shrink-0 text-violet-700" />
            ) : isDrawioPath(row.path) ? (
              <PenLine className="h-4 w-4 shrink-0 text-orange-700" />
            ) : isE2JsonPath(row.path) ? (
              <LayoutGrid className="h-4 w-4 shrink-0 text-violet-700" />
            ) : (
              <File className="h-4 w-4 shrink-0 text-sky-500" />
            )}
            <span className="truncate font-medium text-zinc-800 dark:text-zinc-100">{row.name}</span>
            {row.kind === 'directory' && vaultRoots.includes(row.path) && (
              <span
                className={`shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide ${
                  isVaultUnlocked(row.path)
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                    : 'bg-blue-200 text-blue-950 dark:bg-blue-900 dark:text-blue-100'
                }`}
              >
                {isVaultUnlocked(row.path) ? 'Tresor · offen' : 'Tresor'}
              </span>
            )}
            {meta && (
              <span title="Metadaten-JSON vorhanden" className="inline-flex">
                <FileJson className="h-3.5 w-3.5 shrink-0 text-blue-700" />
              </span>
            )}
            {inSearch && <span className="truncate text-xs text-zinc-400">{row.path}</span>}
          </span>
          <span className="text-xs text-zinc-500 tabular-nums">
            {row.kind === 'file' ? formatBytes(row.size ?? 0) : '—'}
          </span>
          <span className="text-xs text-zinc-500">{formatDate(row.lastModified)}</span>
        </button>
      )
    },
    [
      canWrite,
      hasSidecar,
      inSearch,
      listing,
      onFileContextMenu,
      onNavigate,
      onOpenViewer,
      onSelectEntry,
      selectedId,
      selectedIds,
      vaultRoots,
    ],
  )

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {!inSearch && (
        <ScopeBar
          workspaceRootName={rootName}
          scopePath={scopePath}
          onSelectScope={onNavigate}
          vaultRoots={vaultRoots}
          onRefreshScope={onRefreshScope}
          refreshingScope={refreshingScope}
        />
      )}
      {!inSearch && onToggleScopeBookmark && onBookmarkActivate && onBookmarkRemove && (
        <BookmarksStrip
          bookmarks={bookmarks}
          scopePath={scopePath}
          selectedPath={selectedEntryPath}
          scopeBookmarked={scopeBookmarked}
          onToggleScopeBookmark={onToggleScopeBookmark}
          onActivate={onBookmarkActivate}
          onRemove={onBookmarkRemove}
        />
      )}
      <div className="shrink-0">
        {!inSearch && (
          <ScopeCreateActions
            canWrite={canWrite}
            onNewFolder={onNewFolder}
            onNewMarkdown={onNewMarkdown}
            onNewTskFile={onNewTskFile}
            onNewLinkFile={onNewLinkFile}
            onNewDrawioFile={onNewDrawioFile}
            onNewE2Board={onNewE2Board}
            onNewVaultFolder={onNewVaultFolder}
          />
        )}
        {!inSearch && scopeVaultLocked && onUnlockVault && (
          <div className="flex items-center justify-between gap-2 border-b-2 border-blue-300 bg-blue-100/90 px-3 py-2 dark:border-blue-700 dark:bg-blue-950/50">
            <p className="flex flex-col gap-0.5 text-xs font-medium text-blue-950 dark:text-blue-100 sm:flex-row sm:items-center sm:gap-1.5">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-4 w-4 shrink-0 text-blue-800" />
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Verschlüsselter Tresor — Inhalte nur nach Entsperren sichtbar.
              </span>
              {(() => {
                const vaultKey = workspaceIsVault ? '' : activeVaultRoot ?? ''
                const onDisk = getVaultOpaqueOnDiskCount(vaultKey)
                if (onDisk == null || onDisk < 1) return null
                return (
                  <span className="text-[11px] font-normal text-blue-900/90 dark:text-blue-200/90">
                    ({onDisk} verschlüsselte Einträge auf der Platte)
                  </span>
                )
              })()}
            </p>
            <button
              type="button"
              className="shrink-0 rounded-md bg-blue-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
              onClick={() => onUnlockVault(workspaceIsVault ? '' : activeVaultRoot ?? '')}
            >
              Entsperren…
            </button>
          </div>
        )}
        {!inSearch && scopeVaultOpen && onLockVault && (
          <div className="flex items-center justify-between gap-2 border-b-2 border-emerald-300 bg-emerald-50/90 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/40">
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-950 dark:text-emerald-100">
              <Shield className="h-4 w-4 shrink-0 text-emerald-700" />
              Tresor ist entsperrt — Inhalte liegen nur im Arbeitsspeicher verschlüsselt vor.
            </p>
            <button
              type="button"
              className="shrink-0 rounded-md border border-emerald-700 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
              onClick={() => onLockVault(vaultRootKey)}
            >
              Sperren
            </button>
          </div>
        )}
        {inSearch && (
          <>
            <ScopeBar
              workspaceRootName={rootName}
              scopePath={scopePath}
              onSelectScope={onNavigate}
              variant="compact"
              vaultRoots={vaultRoots}
            />
            <p className="border-b border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {searchResults.length} Treffer für &quot;{searchQuery}&quot;
              {searchTasksOnly ? ' (nur Aufgaben)' : ''} · Scope: aktueller Ordner
            </p>
          </>
        )}
      </div>
      <div
        className={listSurfaceClass}
        onDragEnter={onFileListDragEnter}
        onDragLeave={onFileListDragLeave}
        onDragOver={onFileListDragOver}
        onDrop={onFileListDrop}
        onContextMenu={onFileListContextMenu}
      >
        {fileDropActive && (
          <div className="pointer-events-none sticky top-0 z-10 flex items-center justify-center gap-2 border-b border-emerald-300 bg-emerald-100/95 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100">
            <Upload className="h-4 w-4 shrink-0" />
            Dateien hier ablegen — werden in diesen Ordner kopiert
          </div>
        )}
        {useVirtualList ? (
          <VirtualList
            items={listing}
            getKey={(row) => row.id}
            renderRow={renderListingRow}
            empty={emptyListing}
          />
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {listing.length === 0 ? (
              <li>{emptyListing}</li>
            ) : (
              listing.map((row) => <li key={row.id}>{renderListingRow(row)}</li>)
            )}
          </ul>
        )}
      </div>
    </section>
  )
}