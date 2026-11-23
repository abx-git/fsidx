import { CheckSquare, ChevronDown, FileText, FolderPlus } from 'lucide-react'
import { useState } from 'react'

interface ScopeCreateActionsProps {
  canWrite: boolean
  onNewFolder: () => void
  onNewMarkdown: () => void
  onNewTask?: () => void
  onNewTaskWithDialog?: () => void
  compact?: boolean
}

export function ScopeCreateActions({
  canWrite,
  onNewFolder,
  onNewMarkdown,
  onNewTask,
  onNewTaskWithDialog,
  compact,
}: ScopeCreateActionsProps) {
  const pad = compact ? 'px-2 py-1.5' : 'px-3 py-2'
  const [moreOpen, setMoreOpen] = useState(false)
  const chip =
    'inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'

  return (
    <div className={`flex flex-wrap items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 ${pad}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Anlegen</span>
      {onNewTask && (
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewTask}
          className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          title="Neue Aufgaben-Datei (*.tsk.json) in diesem Ordner"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          .tsk.json
        </button>
      )}
      <button type="button" disabled={!canWrite} onClick={onNewFolder} className={chip}>
        <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
        Ordner
      </button>
      <button type="button" disabled={!canWrite} onClick={onNewMarkdown} className={chip}>
        <FileText className="h-3.5 w-3.5 text-sky-500" />
        Markdown
      </button>
      {onNewTaskWithDialog && (
        <div className="relative">
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => setMoreOpen((v) => !v)}
            className={chip}
          >
            Mehr
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-[11px] hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => {
                  setMoreOpen(false)
                  onNewTaskWithDialog()
                }}
              >
                Aufgabe mit Titel &amp; Text…
              </button>
            </div>
          )}
        </div>
      )}
      {!canWrite && (
        <p className="w-full text-[10px] text-amber-800 dark:text-amber-200">
          Schreibzugriff: oben „Ordner öffnen“.
        </p>
      )}
    </div>
  )
}