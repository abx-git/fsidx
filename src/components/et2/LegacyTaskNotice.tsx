import { FileWarning, ListTodo } from 'lucide-react'

interface LegacyTaskNoticeProps {
  fileName: string
  onCreateTsk: () => void
  onOpenAsMarkdown: () => void
  canWrite: boolean
}

export function LegacyTaskNotice({
  fileName,
  onCreateTsk,
  onOpenAsMarkdown,
  canWrite,
}: LegacyTaskNoticeProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50/90 px-3 py-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/25">
      <p className="flex items-start gap-2 font-medium text-amber-950 dark:text-amber-100">
        <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
        Alte Aufgabendatei
      </p>
      <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
        <code className="text-[11px]">{fileName}</code> liegt im Legacy-Format unter{' '}
        <code className="text-[11px]">.et2/tasks/</code>. Neu: Aufgaben als{' '}
        <code className="text-[11px]">*.tsk.json</code> im normalen Ordner — rechts bearbeiten, ohne Systemordner.
      </p>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          disabled={!canWrite}
          onClick={onCreateTsk}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
        >
          <ListTodo className="h-3.5 w-3.5" />
          Neue .tsk.json im übergeordneten Ordner
        </button>
        <button
          type="button"
          onClick={onOpenAsMarkdown}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-100"
        >
          Trotzdem als Markdown öffnen
        </button>
      </div>
    </div>
  )
}