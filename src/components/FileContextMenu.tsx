import {
  Eye,
  FileJson,
  FileText,
  Pencil,
  type LucideIcon,
} from 'lucide-react'
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
  onEt2FolderMeta?: () => void
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
  onEt2FolderMeta,
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
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Verzeichnis
        </p>
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
            <Pencil className="h-4 w-4 shrink-0 text-violet-500" />
            <span>ET2-Aufgabe anlegen</span>
          </button>
        )}
        {onEt2FolderMeta && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              onEt2FolderMeta()
              onClose()
            }}
          >
            <FileJson className="h-4 w-4 shrink-0 text-violet-500" />
            <span>Ordner-Metadaten (.et2/folder.json)</span>
          </button>
        )}
        {!canWrite && (
          <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-amber-700 dark:border-zinc-800 dark:text-amber-300">
            Anlegen/Speichern: Ordner mit Chrome/Edge (Schreibzugriff) öffnen.
          </p>
        )}
      </div>
    )
  }

  const viewerOptions = viewerOptionsForFile(target.path, target.extension)

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[260px] max-w-[min(320px,90vw)] rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{ left: target.x, top: target.y }}
      role="menu"
    >
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        Öffnen mit
      </p>
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

      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" role="separator" />

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
      {!canWrite && (
        <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-amber-700 dark:border-zinc-800 dark:text-amber-300">
          Sidecar speichern: Ordner mit Chrome/Edge (Schreibzugriff) öffnen.
        </p>
      )}
    </div>
  )
}