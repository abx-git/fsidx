import { CheckSquare, GitBranch, Loader2 } from 'lucide-react'
import { ScopeCreateActions } from '../ScopeCreateActions'
import { ScopeBar } from '../ScopeBar'
import type { Et2TaskSummary } from '../../types/et2-task'
import { normalizeScopePath } from '../../lib/workspace-scope'
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
  onSelectTask: (relativePath: string, entryId: string | null) => void
  onOpenTask: (relativePath: string, title: string, entryId: string | null) => void
  onNewTask: () => void
  onNewSubtask?: () => void
  onNewFolder?: () => void
  onNewMarkdown?: () => void
  taskPathToEntryId: Map<string, string>
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
  onOpenTask,
  onNewTask,
  onNewSubtask,
  onNewFolder,
  onNewMarkdown,
  taskPathToEntryId,
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
        <div className="flex flex-wrap justify-end gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <button
            type="button"
            disabled={!canWrite || !onNewSubtask || !selectedTaskPath}
            onClick={onNewSubtask}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-40 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950/40"
            title="Zuerst Aufgabe in der Liste wählen"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Unteraufgabe
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          <CheckSquare className="h-3.5 w-3.5 text-violet-500" />
          <span>
            Wähle eine Aufgabe · Inhalt unten bearbeiten (Markdown)
          </span>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
        </div>
      </div>

      {!canWrite && (
        <p className="shrink-0 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Aufgaben speichern: Ordner mit Chrome/Edge (Schreibzugriff) öffnen.
        </p>
      )}

      <div className="flex max-h-[38%] min-h-[120px] shrink-0 flex-col overflow-y-auto overscroll-contain border-b border-zinc-200 dark:border-zinc-800">
        {tasks.length === 0 && !loading ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Keine Aufgaben im Teilbaum. Über „Anlegen → Aufgabe“ starten.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => {
              const entryId = taskPathToEntryId.get(task.relativePath) ?? null
              const selected = selectedTaskPath === task.relativePath
              const folder = task.folderWithinScope
              const folderScopePath =
                folder && folder !== '.'
                  ? scope
                    ? `${scope}/${folder}`
                    : folder
                  : scope
              return (
                <li key={task.relativePath}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
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
                    </span>
                  </button>
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
        onOpenFullEditor={
          selectedTaskPath
            ? () => {
                const entryId = taskPathToEntryId.get(selectedTaskPath) ?? null
                const task = tasks.find((t) => t.relativePath === selectedTaskPath)
                onOpenTask(selectedTaskPath, task?.title ?? taskEditor.title, entryId)
              }
            : undefined
        }
      />
    </section>
  )
}