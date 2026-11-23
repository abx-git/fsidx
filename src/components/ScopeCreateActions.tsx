import { CheckSquare, FileText, FolderPlus } from 'lucide-react'
import { CollapsibleSection } from './ui/CollapsibleSection'

interface ScopeCreateActionsProps {
  canWrite: boolean
  onNewFolder: () => void
  onNewMarkdown: () => void
  onNewTask?: () => void
  compact?: boolean
}

export function ScopeCreateActions({
  canWrite,
  onNewFolder,
  onNewMarkdown,
  onNewTask,
  compact,
}: ScopeCreateActionsProps) {
  const pad = compact ? 'px-2 py-1.5' : 'px-3 py-2'
  const btnPrimary =
    'inline-flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-300 dark:disabled:bg-violet-900'
  const btnSec =
    'inline-flex w-full items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'

  return (
    <div className={`flex flex-wrap items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 ${pad}`}>
      {onNewTask && (
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewTask}
          className={btnPrimary}
          title={!canWrite ? 'Ordner mit Schreibzugriff öffnen' : 'Neue Aufgabe hier'}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Neue Aufgabe
        </button>
      )}
      <CollapsibleSection summary="Weitere anlegen" className="py-0.5">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
          <button type="button" disabled={!canWrite} onClick={onNewFolder} className={btnSec}>
            <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
            Ordner
          </button>
          <button type="button" disabled={!canWrite} onClick={onNewMarkdown} className={btnSec}>
            <FileText className="h-3.5 w-3.5 text-sky-500" />
            Markdown-Datei
          </button>
        </div>
      </CollapsibleSection>
      {!canWrite && (
        <p className="w-full text-[10px] leading-snug text-amber-800 dark:text-amber-200">
          Zum Anlegen: Ordner in Chrome/Edge mit Schreibzugriff öffnen.
        </p>
      )}
    </div>
  )
}