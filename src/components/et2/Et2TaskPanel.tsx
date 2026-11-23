import { CheckSquare, Loader2, Plus } from 'lucide-react'
import { ScopeBar } from '../ScopeBar'
import type { Et2TaskSummary } from '../../types/et2-task'
import { normalizeScopePath } from '../../lib/workspace-scope'

interface Et2TaskPanelProps {
  rootName: string
  scopePath: string
  onSelectScope: (path: string) => void
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
  scopePath,
  onSelectScope,
  tasks,
  loading,
  canWrite,
  selectedTaskPath,
  onSelectTask,
  onOpenTask,
  onNewTask,
  taskPathToEntryId,
}: Et2TaskPanelProps) {
  const scope = normalizeScopePath(scopePath)

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <div className="shrink-0">
        <ScopeBar
          workspaceRootName={rootName}
          scopePath={scopePath}
          onSelectScope={onSelectScope}
        />
        <div className="flex justify-end border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <button
          type="button"
          disabled={!canWrite}
          onClick={onNewTask}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Neue Aufgabe (Scope)
        </button>
        </div>

        <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
        <CheckSquare className="h-3.5 w-3.5 text-violet-500" />
        <span>
          Alle Aufgaben im Teilbaum unter dem Scope (<strong className="font-medium">.et2/tasks</strong>)
        </span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
        </div>
      </div>

      {!canWrite && (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Aufgaben speichern: Ordner mit Chrome/Edge (Schreibzugriff) öffnen.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tasks.length === 0 && !loading ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Keine Aufgaben im aktuellen Teilbaum. Leg eine Aufgabe im Scope-Ordner an oder wechsle den Scope.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => {
              const entryId = taskPathToEntryId.get(task.relativePath) ?? null
              const selected = selectedTaskPath === task.relativePath
              const folder = task.folderWithinScope
              const folderScopePath =
                folder && folder !== '.'
                  ? scope ? `${scope}/${folder}` : folder
                  : scope
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
                      {folder && (
                        <span
                          className="rounded bg-zinc-100 px-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          title="Ordner im Scope — Klick springt dorthin"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectScope(folderScopePath)
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          role="link"
                        >
                          📁 {folder === '.' ? '(Scope)' : folder}
                        </span>
                      )}
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