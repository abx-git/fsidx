import {
  Eye,
  FileJson,
  FileText,
  FolderOpen,
  FolderPlus,
  ListTodo,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { isTskJsonPath } from '../lib/et2/tsk-paths'
import { useEffect, useRef } from 'react'
import {
  viewerOptionsForFile,
  type FileViewerKind,
} from '../lib/file-viewers'
import { DIRECTORY_README_NAME } from '../lib/directory-readme'

export interface ContextMenuTarget {
  id: string
  path: string
  name: string
  kind: 'file' | 'directory'
  extension?: string
  x: number
  y: number
}

const VIEWER_ICONS: Partial<Record<FileViewerKind, LucideIcon>> = {
  markdown: Eye,
  image: Eye,
  text: Eye,
  json: Eye,
  pdf: Eye,
  audio: Eye,
  video: Eye,
  binary: Eye,
}

interface FileContextMenuProps {
  target: ContextMenuTarget | null
  onClose: () => void
  hasSidecar: boolean
  canWrite: boolean
  onCreateOrEditMetadata: () => void
  onOpenViewer: (kind: FileViewerKind) => void
  hasDirectoryReadme: boolean
  onDirectoryReadme: () => void
  onEt2NewTask?: () => void
  onNewSubfolder?: () => void
  onNewMarkdown?: () => void
  onDelete?: () => void
  onOpenInScope?: () => void
}

export function FileContextMenu({
  target,
  onClose,
  hasSidecar,
  canWrite,
  onCreateOrEditMetadata,
  onOpenViewer,
  hasDirectoryReadme,
  onDirectoryReadme,
  onEt2NewTask,
  onNewSubfolder,
  onNewMarkdown,
  onDelete,
  onOpenInScope,
}: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!target) return
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [target, onClose])

  if (!target) return null

  if (target.kind === 'directory') {
    return (
      <div
        ref={ref}
        className="fixed z-50 min-w-[260px] max-w-[min(320px,90vw)] rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        style={{ left: target.x, top: target.y }}
        role="menu"
      >
        <p className="truncate px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-100" title={target.path}>
          {target.name || target.path}
        </p>
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Ordner</p>
        {onOpenInScope && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              onOpenInScope()
              onClose()
            }}
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>In Dateiliste öffnen</span>
          </button>
        )}
        {onNewSubfolder && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              onNewSubfolder()
              onClose()
            }}
          >
            <FolderPlus className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Neuer Unterordner</span>
          </button>
        )}
        {onNewMarkdown && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              onNewMarkdown()
              onClose()
            }}
          >
            <FileText className="h-4 w-4 shrink-0 text-sky-500" />
            <span>Neue Markdown-Datei</span>
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => {
            onDirectoryReadme()
            onClose()
          }}
        >
          <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            {hasDirectoryReadme
              ? `${DIRECTORY_README_NAME} bearbeiten`
              : `${DIRECTORY_README_NAME} anlegen`}
          </span>
        </button>
        {onEt2NewTask && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              onEt2NewTask()
              onClose()
            }}
          >
            <ListTodo className="h-4 w-4 shrink-0 text-violet-500" />
            <span>Neue .tsk.json</span>
          </button>
        )}
        {onDelete && (
          <>
            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" role="separator" />
            <button
              type="button"
              role="menuitem"
              disabled={!canWrite}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-950/40"
              onClick={() => {
                onDelete()
                onClose()
              }}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span>Ordner löschen…</span>
            </button>
          </>
        )}
        {!canWrite && (
          <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-amber-700 dark:border-zinc-800 dark:text-amber-300">
            Anlegen/Speichern: Ordner mit Chrome/Edge (Schreibzugriff) öffnen.
          </p>
        )}
      </div>
    )
  }

  const isTsk = isTskJsonPath(target.path)
  const viewerOptions = isTsk
    ? []
    : viewerOptionsForFile(target.path, target.extension)

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[260px] max-w-[min(320px,90vw)] rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{ left: target.x, top: target.y }}
      role="menu"
    >
      <p className="truncate px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-100" title={target.path}>
        {target.name}
      </p>
      {isTsk && onOpenInScope && (
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => {
            onOpenInScope()
            onClose()
          }}
        >
          <ListTodo className="h-4 w-4 shrink-0 text-violet-500" />
          <span>Aufgaben bearbeiten</span>
        </button>
      )}
      {!isTsk && (
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Öffnen mit</p>
      )}
      {viewerOptions.map((opt) => {
        const Icon = VIEWER_ICONS[opt.kind] ?? Eye
        return (
          <button
            key={opt.kind}
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              onOpenViewer(opt.kind)
              onClose()
            }}
          >
            <Icon className="h-4 w-4 shrink-0 text-sky-500" />
            <span className="truncate">{opt.label}</span>
          </button>
        )
      })}

      {!isTsk && viewerOptions.length > 0 && (
        <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" role="separator" />
      )}

      {!isTsk && (
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => {
            onCreateOrEditMetadata()
            onClose()
          }}
        >
          {hasSidecar ? (
            <Pencil className="h-4 w-4 text-violet-500" />
          ) : (
            <FileJson className="h-4 w-4 text-violet-500" />
          )}
          {hasSidecar ? 'Metadaten bearbeiten' : 'Metadaten-JSON erstellen'}
        </button>
      )}
      {onDelete && (
        <>
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" role="separator" />
          <button
            type="button"
            role="menuitem"
            disabled={!canWrite}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-950/40"
            onClick={() => {
              onDelete()
              onClose()
            }}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>Datei löschen…</span>
          </button>
        </>
      )}
      {!canWrite && (
        <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-amber-700 dark:border-zinc-800 dark:text-amber-300">
          Sidecar speichern: Ordner mit Chrome/Edge (Schreibzugriff) öffnen.
        </p>
      )}
    </div>
  )
}