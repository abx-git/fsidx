import { GitBranch, Loader2, ListTodo } from 'lucide-react'
import { ScopeCreateActions } from '../ScopeCreateActions'
import { ScopeBar } from '../ScopeBar'
import type { Et2TaskSummary } from '../../types/et2-task'
import type { Et2TaskStatus } from '../../types/et2-tasks-bundle'
import { normalizeScopePath } from '../../lib/workspace-scope'
import { formatTaskFolderLabel } from '../../lib/et2/display-title'
import { et2TaskStatusLabel } from '../../lib/et2/task-status-labels'
import { Et2TaskContentEditor } from './Et2TaskContentEditor'

interface TaskEditorSlice {
  title: string
  body: string
  status: Et2TaskStatus
  onTitleChange: (v: string) => void
  onBodyChange: (v: string) => void
  onStatusChange: (v: Et2TaskStatus) => void
  onSave: () => Promise<void>
  loading: boolean
  saving: boolean
  dirty: boolean
  error: string | null
}

interface Et2TaskPanelProps {
  rootName: string
  scopePath: string
  onSelectScope: (path: string) => void
  tasks: Et2TaskSummary[]
  loading: boolean
  canWrite: boolean
  selectedTaskPath: string | null
  onSelectTask: (relativePath: string) => void
  onNewTask: () => void
  onNewTaskWithDialog?: () => void
  onNewSubtask?: () => void
  onNewFolder?: () => void
  onNewMarkdown?: () => void
  taskEditor: TaskEditorSlice
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
  onNewTask,
  onNewTaskWithDialog,
  onNewSubtask,
  onNewFolder,
  onNewMarkdown,
  taskEditor,
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
        <ScopeCreateActions
          canWrite={canWrite}
          onNewFolder={onNewFolder ?? (() => {})}
          onNewMarkdown={onNewMarkdown ?? (() => {})}
          onNewTskFile={onNewTaskWithDialog ?? onNewTask}
          compact
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800">
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <ListTodo className="h-3.5 w-3.5 text-violet-500" />
            {loading ? (
              <>
                Laden…
                <Loader2 className="h-3 w-3 animate-spin" />
              </>
            ) : (
              <span>
                {tasks.length === 0
                  ? 'Keine Aufgaben'
                  : `${tasks.length} Aufgabe${tasks.length === 1 ? '' : 'n'}`}
              </span>
            )}
          </p>
          {onNewSubtask && (
            <button
              type="button"
              disabled={!canWrite || !selectedTaskPath}
              onClick={onNewSubtask}
              className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 px-2 py-1 text-[11px] font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-40 dark:border-violet-800 dark:text-violet-200"
              title="Unteraufgabe in derselben tasks.json — kein neuer Ordner"
            >
              <GitBranch className="h-3 w-3" />
              Unteraufgabe
            </button>
          )}
        </div>
      </div>

      {!canWrite && (
        <p className="shrink-0 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Zum Bearbeiten den Arbeitsordner mit Schreibzugriff öffnen (Chrome/Edge).
        </p>
      )}

      <div className="flex max-h-[36%] min-h-[100px] shrink-0 flex-col overflow-y-auto overscroll-contain border-b border-zinc-200 dark:border-zinc-800">
        {tasks.length === 0 && !loading ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Leg über <strong className="font-medium">Anlegen → Aufgabe</strong> die erste Aufgabe in diesem
            Bereich an (gespeichert in <code className="text-xs">.et2/tasks.json</code>).
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => {
              const selected = selectedTaskPath === task.relativePath
              const folderLabel = formatTaskFolderLabel(task.folderWithinScope)
              const folder = task.folderWithinScope
              const folderScopePath =
                folder && folder !== '.'
                  ? scope
                    ? `${scope}/${folder}`
                    : folder
                  : scope
              const depth = task.depth ?? 0
              const statusLabel = task.status ? et2TaskStatusLabel(task.status) : null
              return (
                <li key={task.relativePath}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`flex w-full cursor-pointer flex-col gap-0.5 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                      selected ? 'border-l-2 border-violet-500 bg-violet-50/90 dark:bg-violet-950/25' : ''
                    }`}
                    style={{ paddingLeft: `${1 + depth * 0.75}rem`, paddingRight: '1rem' }}
                    onClick={() => onSelectTask(task.relativePath)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectTask(task.relativePath)
                      }
                    }}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</span>
                      {statusLabel && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            task.status === 'done'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                              : task.status === 'in_progress'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
                                : task.status === 'cancelled'
                                  ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  : 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      )}
                    </span>
                    {folderLabel && (
                      <span
                        className="w-fit text-[11px] text-violet-700 hover:underline dark:text-violet-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectScope(folderScopePath)
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="link"
                      >
                        Ordner: {folderLabel}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Et2TaskContentEditor
        taskPath={selectedTaskPath}
        title={taskEditor.title}
        body={taskEditor.body}
        status={taskEditor.status}
        onTitleChange={taskEditor.onTitleChange}
        onBodyChange={taskEditor.onBodyChange}
        onStatusChange={taskEditor.onStatusChange}
        onSave={taskEditor.onSave}
        loading={taskEditor.loading}
        saving={taskEditor.saving}
        dirty={taskEditor.dirty}
        error={taskEditor.error}
        canWrite={canWrite}
      />
    </section>
  )
}