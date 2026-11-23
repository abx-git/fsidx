import { GitBranch, Loader2, ListTodo, Save } from 'lucide-react'
import type { Et2TaskSummary } from '../../types/et2-task'
import type { Et2TaskStatus } from '../../types/et2-tasks-bundle'
import { et2TaskStatusLabel } from '../../lib/et2/task-status-labels'
import { DEFAULT_NEW_TASK_TITLE } from '../../lib/et2/constants'
import { ET2_TASK_STATUS_OPTIONS } from '../../lib/et2/task-status-labels'
import { LivePreviewMarkdown } from '../markdown/LivePreviewMarkdown'
import { taskRefFromPath } from '../../lib/et2/paths'

interface TskDetailPanelProps {
  fileName: string
  tasks: Et2TaskSummary[]
  loading: boolean
  loadError: string | null
  selectedTaskRef: string | null
  onSelectTask: (taskRef: string) => void
  onNewSubtask: () => void
  canWrite: boolean
  title: string
  body: string
  status: Et2TaskStatus
  onTitleChange: (v: string) => void
  onBodyChange: (v: string) => void
  onStatusChange: (v: Et2TaskStatus) => void
  onSave: () => Promise<void>
  editorLoading: boolean
  editorSaving: boolean
  editorDirty: boolean
  editorError: string | null
}

export function TskDetailPanel({
  fileName,
  tasks,
  loading,
  loadError,
  selectedTaskRef,
  onSelectTask,
  onNewSubtask,
  canWrite,
  title,
  body,
  status,
  onTitleChange,
  onBodyChange,
  onStatusChange,
  onSave,
  editorLoading,
  editorSaving,
  editorDirty,
  editorError,
}: TskDetailPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-violet-50/20 dark:bg-violet-950/10">
      <div className="shrink-0 border-b border-violet-200 px-3 py-2 dark:border-violet-900/50">
        <p className="flex items-center gap-1.5 text-xs font-medium text-violet-900 dark:text-violet-100">
          <ListTodo className="h-3.5 w-3.5" />
          Aufgaben · {fileName}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canWrite || !selectedTaskRef}
            onClick={onNewSubtask}
            className="inline-flex items-center gap-1 rounded border border-violet-300 px-2 py-0.5 text-[10px] font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-40 dark:border-violet-700 dark:text-violet-100"
          >
            <GitBranch className="h-3 w-3" />
            Unteraufgabe
          </button>
          <button
            type="button"
            disabled={!canWrite || !selectedTaskRef || !editorDirty || editorSaving}
            onClick={() => void onSave()}
            className="inline-flex items-center gap-1 rounded bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {editorSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Speichern
          </button>
        </div>
      </div>

      {loadError && (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40">
          {loadError}
        </p>
      )}

      <div className="max-h-[32%] shrink-0 overflow-y-auto border-b border-zinc-200 dark:border-zinc-800">
        {loading ? (
          <p className="flex items-center gap-2 px-3 py-4 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Laden…
          </p>
        ) : tasks.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-500">Keine Einträge in dieser Datei.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => {
              const selected = selectedTaskRef === task.relativePath
              const depth = task.depth ?? 0
              return (
                <li key={task.relativePath}>
                  <button
                    type="button"
                    onClick={() => onSelectTask(task.relativePath)}
                    className={`flex w-full flex-col gap-0.5 py-2 text-left text-xs hover:bg-violet-50 dark:hover:bg-violet-950/30 ${
                      selected ? 'bg-violet-100/80 dark:bg-violet-950/40' : ''
                    }`}
                    style={{ paddingLeft: `${0.75 + depth * 0.6}rem`, paddingRight: '0.75rem' }}
                  >
                    <span className="flex flex-wrap items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {task.title}
                      {task.status && (
                        <span className="rounded-full bg-white/80 px-1 py-0.5 text-[9px] font-normal text-violet-800 dark:bg-zinc-900">
                          {et2TaskStatusLabel(task.status)}
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!selectedTaskRef ? (
          <p className="px-3 py-6 text-center text-xs text-zinc-500">Aufgabe in der Liste wählen.</p>
        ) : editorLoading ? (
          <p className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Aufgabe laden…
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {taskRefFromPath(selectedTaskRef) && (
              <label className="shrink-0 border-b border-violet-100 px-3 py-2 text-xs dark:border-violet-900/40">
                <span className="font-medium text-zinc-500">Status</span>
                <select
                  value={status}
                  onChange={(e) => onStatusChange(e.target.value as Et2TaskStatus)}
                  disabled={!canWrite}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                >
                  {ET2_TASK_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="shrink-0 border-b border-violet-100 px-3 py-2 text-xs dark:border-violet-900/40">
              <span className="font-medium text-zinc-500">Titel</span>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === DEFAULT_NEW_TASK_TITLE) onTitleChange('')
                }}
                disabled={!canWrite}
                placeholder={DEFAULT_NEW_TASK_TITLE}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <div className="min-h-0 flex-1 [&_.markdown-preview]:max-w-none [&_.markdown-preview]:px-3 [&_.markdown-preview]:py-2">
              <LivePreviewMarkdown
                content={body}
                onChange={onBodyChange}
                canWrite={canWrite}
                compactHints
              />
            </div>
            {editorDirty && (
              <p className="shrink-0 px-3 py-1 text-[10px] text-amber-700 dark:text-amber-300">Nicht gespeichert</p>
            )}
            {editorError && (
              <p className="mx-3 mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950/40">
                {editorError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}