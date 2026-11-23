import { ListTodo, X } from 'lucide-react'
import type { Et2TaskSummary } from '../../types/et2-task'
import { formatScopeLabel } from '../../lib/workspace-connection'

interface Et2AggregateTaskPanelProps {
  scopePath: string
  rootName: string
  tasks: Et2TaskSummary[]
  loading: boolean
  onOpenTask: (taskRef: string, bundlePath: string) => void
  onClose: () => void
}

export function Et2AggregateTaskPanel({
  scopePath,
  rootName,
  tasks,
  loading,
  onOpenTask,
  onClose,
}: Et2AggregateTaskPanelProps) {
  const scopeLabel = formatScopeLabel(scopePath, rootName)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-sky-50/30 dark:bg-sky-950/10">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-sky-200 px-3 py-2 dark:border-sky-900/50">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-sky-900 dark:text-sky-100">
            <ListTodo className="h-3.5 w-3.5" />
            Aufgabenübersicht (lesend)
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            Unterbaum: {scopeLabel} · Bearbeiten in den einzelnen <code className="text-[9px]">.tsk.json</code>
          </p>
        </div>
        <button
          type="button"
          title="Übersicht schließen"
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-3 py-4 text-xs text-zinc-500">Aufgaben werden geladen…</p>
        ) : tasks.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-zinc-500">Keine Aufgaben in diesem Unterbaum.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
            {tasks.map((task) => (
              <li key={task.relativePath}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-sky-50 dark:hover:bg-sky-950/30"
                  onClick={() =>
                    onOpenTask(task.relativePath, task.bundlePath ?? task.relativePath.split('#')[0])
                  }
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</span>
                  <span className="truncate text-[10px] text-zinc-500">
                    {task.folderWithinScope ? `${task.folderWithinScope}/` : ''}
                    {task.bundlePath?.split('/').pop() ?? task.relativePath}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}