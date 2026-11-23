import { CheckSquare, FileText, FolderPlus } from 'lucide-react'

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
  const btn =
    compact === true
      ? 'rounded-md px-2 py-1 text-[11px]'
      : 'rounded-lg px-2.5 py-1.5 text-xs'

  return (
    <div
      className={`flex flex-col gap-1.5 border-b border-zinc-100 dark:border-zinc-800 ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Anlegen</span>
        {onNewTask && (
          <button
            type="button"
            disabled={!canWrite}
            onClick={onNewTask}
            className={`inline-flex items-center gap-1 bg-violet-600 font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-300 dark:disabled:bg-violet-900 ${btn}`}
            title={!canWrite ? 'Chrome/Edge mit Schreibzugriff nötig' : 'ET2-Aufgabe im aktuellen Scope'}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Aufgabe
          </button>
        )}
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewFolder}
          className={`inline-flex items-center gap-1 border border-zinc-200 bg-white font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${btn}`}
          title={!canWrite ? 'Chrome/Edge mit Schreibzugriff nötig' : undefined}
        >
          <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
          Ordner
        </button>
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewMarkdown}
          className={`inline-flex items-center gap-1 border border-zinc-200 bg-white font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${btn}`}
          title={!canWrite ? 'Chrome/Edge mit Schreibzugriff nötig' : undefined}
        >
          <FileText className="h-3.5 w-3.5 text-sky-500" />
          Markdown
        </button>
      </div>
      {!canWrite && (
        <p className="text-[10px] leading-snug text-amber-800 dark:text-amber-200">
          Anlegen/Speichern: Ordner mit <strong>Chrome oder Edge</strong> öffnen und Schreibzugriff
          erlauben (nicht nur „Ordner wählen“).
        </p>
      )}
    </div>
  )
}