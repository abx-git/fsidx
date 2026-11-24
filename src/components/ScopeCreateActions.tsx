import { CheckSquare, FileText, FolderPlus, Shield } from 'lucide-react'
import type { ReactNode } from 'react'

interface ScopeCreateActionsProps {
  canWrite: boolean
  onNewFolder: () => void
  onNewMarkdown: () => void
  onNewTskFile?: () => void
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
  onNewVaultFolder,
  compact,
  extra,
}: ScopeCreateActionsProps) {
  const pad = compact ? 'px-2 py-1.5' : 'px-3 py-2'
  const chip =
    'inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'

  return (
    <div className={`flex flex-wrap items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 ${pad}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Anlegen</span>
      {onNewTskFile && (
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewTskFile}
          className="inline-flex items-center gap-1 rounded-md bg-blue-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          title="Neue Aufgaben-Datei (Aufgaben.tsk.json, ggf. nummeriert)"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Aufgaben-Datei
        </button>
      )}
      {extra}
      <button type="button" disabled={!canWrite} onClick={onNewFolder} className={chip}>
        <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
        Ordner
      </button>
      {onNewVaultFolder && (
        <button type="button" disabled={!canWrite} onClick={onNewVaultFolder} className={chip}>
          <Shield className="h-3.5 w-3.5 text-blue-800" />
          Tresor
        </button>
      )}
      <button type="button" disabled={!canWrite} onClick={onNewMarkdown} className={chip}>
        <FileText className="h-3.5 w-3.5 text-sky-500" />
        Markdown
      </button>
      {!canWrite && (
        <p className="w-full text-[10px] text-amber-800 dark:text-amber-200">
          Schreibzugriff: oben „Ordner öffnen“.
        </p>
      )}
    </div>
  )
}