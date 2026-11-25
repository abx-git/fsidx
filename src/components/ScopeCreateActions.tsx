import { CheckSquare, FileText, FolderPlus, LayoutGrid, Link2, PenLine, Shield } from 'lucide-react'
import type { ReactNode } from 'react'

interface ScopeCreateActionsProps {
  canWrite: boolean
  onNewFolder: () => void
  onNewMarkdown: () => void
  onNewTskFile?: () => void
  onNewLinkFile?: () => void
  onNewDrawioFile?: () => void
  onNewE2Board?: () => void
  onNewVaultFolder?: () => void
  compact?: boolean
  /** Optional extra chips after Markdown (e.g. header “Neue Aufgaben-Datei”). */
  extra?: ReactNode
}

export function ScopeCreateActions({
  canWrite,
  onNewFolder,
  onNewMarkdown,
  onNewTskFile,
  onNewLinkFile,
  onNewDrawioFile,
  onNewE2Board,
  onNewVaultFolder,
  compact,
  extra,
}: ScopeCreateActionsProps) {
  const pad = compact ? 'px-2 py-1.5' : 'px-3 py-2'
  const iconBtn =
    'inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'

  return (
    <div className={`flex flex-wrap items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 ${pad}`}>
      {onNewTskFile && (
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewTskFile}
          className={iconBtn}
          title="Neue Aufgaben-Datei (Aufgaben.tsk.json, ggf. nummeriert)"
          aria-label="Neue Aufgaben-Datei"
        >
          <CheckSquare className="h-4 w-4" />
        </button>
      )}
      {onNewLinkFile && (
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewLinkFile}
          className={iconBtn}
          title="Neue Link-Datei (*.link.json) mit Web-Vorschau"
          aria-label="Web-Link"
        >
          <Link2 className="h-4 w-4" />
        </button>
      )}
      {onNewDrawioFile && (
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewDrawioFile}
          className={iconBtn}
          title="Neue draw.io-Datei (*.drawio) mit Editor in der Detailansicht"
          aria-label="draw.io"
        >
          <PenLine className="h-4 w-4" />
        </button>
      )}
      {onNewE2Board && (
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewE2Board}
          className={iconBtn}
          title="Leeres E2-Board (*.e2.json) anlegen — bearbeiten & speichern in der Detailansicht"
          aria-label="E2-Board anlegen"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      )}
      {extra}
      <button
        type="button"
        disabled={!canWrite}
        onClick={onNewFolder}
        className={iconBtn}
        title="Neuer Ordner"
        aria-label="Ordner"
      >
        <FolderPlus className="h-4 w-4" />
      </button>
      {onNewVaultFolder && (
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewVaultFolder}
          className={iconBtn}
          title="Neuer Tresor"
          aria-label="Tresor"
        >
          <Shield className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        disabled={!canWrite}
        onClick={onNewMarkdown}
        className={iconBtn}
        title="Neue Markdown-Datei"
        aria-label="Markdown"
      >
        <FileText className="h-4 w-4" />
      </button>
      {!canWrite && (
        <p className="w-full text-[10px] text-amber-800 dark:text-amber-200">
          Schreibzugriff: oben „Ordner öffnen“.
        </p>
      )}
    </div>
  )
}