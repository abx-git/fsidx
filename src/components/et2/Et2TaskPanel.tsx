import { GitBranch, Loader2, ListTodo } from 'lucide-react'
import { ScopeCreateActions } from '../ScopeCreateActions'
import { ScopeBar } from '../ScopeBar'
import type { Et2TaskSummary } from '../../types/et2-task'
import { normalizeScopePath } from '../../lib/workspace-scope'
import { formatTaskFolderLabel } from '../../lib/et2/display-title'
import { Et2TaskContentEditor } from './Et2TaskContentEditor'

interface TaskEditorSlice {
  title: string
  body: string
  onTitleChange: (v: string) => void
  onBodyChange: (v: string) => void
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
          onNewTask={onNewTask}
          compact
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <ListTodo className="h-3.5 w-3.5 text-violet-500" />
            {loading ? (
              <>
                Aufgaben laden…
                <Loader2 className="h-3 w-3 animate-spin" />
              </>
            ) : (
              <span>
                {tasks.length === 0
                  ? 'Noch keine Aufgaben hier'
                  : `${tasks.length} Aufgabe${tasks.length === 1 ? '' : 'n'}`}
              </span>
            )}
          </p>
          <button
            type="button"
            disabled={!canWrite || !onNewSubtask || !selectedTaskPath}
            onClick={onNewSubtask}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-40 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950/40"
            title="Unteraufgabe zur gewählten Aufgabe"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Unteraufgabe
          </button>
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
            Bereich an.
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
              return (
                <li key={task.relativePath}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`flex w-full cursor-pointer flex-col gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                      selected ? 'border-l-2 border-violet-500 bg-violet-50/90 pl-[calc(1rem-2px)] dark:bg-violet-950/25' : ''
                    }`}
                    onClick={() => onSelectTask(task.relativePath)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectTask(task.relativePath)
                      }
                    }}
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</span>
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
        onTitleChange={taskEditor.onTitleChange}
        onBodyChange={taskEditor.onBodyChange}
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