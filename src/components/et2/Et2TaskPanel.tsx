import { CheckSquare, Loader2, Plus } from 'lucide-react'
import { pathBreadcrumbs } from '../TreeNav'
import type { Et2TaskSummary } from '../../types/et2-task'

interface Et2TaskPanelProps {
  rootName: string
  currentPath: string
  onNavigate: (path: string) => void
  tasks: Et2TaskSummary[]
  loading: boolean
  canWrite: boolean
  selectedTaskPath: string | null
  onSelectTask: (relativePath: string, entryId: string | null) => void
  onOpenTask: (relativePath: string, title: string, entryId: string | null) => void
  onNewTask: () => void
  taskPathToEntryId: Map<string, string>
}

export function Et2TaskPanel({
  rootName,
  currentPath,
  onNavigate,
  tasks,
  loading,
  canWrite,
  selectedTaskPath,
  onSelectTask,
  onOpenTask,
  onNewTask,
  taskPathToEntryId,
}: Et2TaskPanelProps) {
  const crumbs = pathBreadcrumbs(currentPath, rootName)

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <span className="text-zinc-400">/</span>}
              <button
                type="button"
                onClick={() => onNavigate(crumb.path)}
                className="rounded px-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewTask}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Neue Aufgabe
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
        <CheckSquare className="h-3.5 w-3.5 text-violet-500" />
        <span>
          ET2-Aufgaben in <strong className="font-medium text-zinc-700 dark:text-zinc-200">.et2/tasks/</strong>
        </span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
      </div>

      {!canWrite && (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Aufgaben speichern: Ordner mit Chrome/Edge (Schreibzugriff) öffnen.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {tasks.length === 0 && !loading ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Keine Aufgaben in diesem Ordner. Leg eine neue an oder migriere ein ET2-Board.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => {
              const entryId = taskPathToEntryId.get(task.relativePath) ?? null
              const selected = selectedTaskPath === task.relativePath
              return (
                <li key={task.relativePath}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                      selected ? 'bg-violet-50 dark:bg-violet-950/30' : ''
                    }`}
                    onClick={() => onSelectTask(task.relativePath, entryId)}
                    onDoubleClick={() => onOpenTask(task.relativePath, task.title, entryId)}
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</span>
                    <span className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
                      {task.kind && <span>{task.kind}</span>}
                      {task.dueDate && (
                        <span>
                          Fällig{' '}
                          {Number.isNaN(Date.parse(task.dueDate))
                            ? task.dueDate
                            : new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.tags?.slice(0, 3).map((t) => (
                        <span key={t} className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                          {t}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}