import { Loader2, Save } from 'lucide-react'
import { DEFAULT_NEW_TASK_TITLE } from '../../lib/et2/constants'
import type { Et2TaskStatus } from '../../types/et2-tasks-bundle'
import { ET2_TASK_STATUS_OPTIONS } from '../../lib/et2/task-status-labels'
import { taskRefFromPath } from '../../lib/et2/paths'
import { LivePreviewMarkdown } from '../markdown/LivePreviewMarkdown'

interface Et2TaskContentEditorProps {
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
  canWrite: boolean
  taskPath: string | null
}

export function Et2TaskContentEditor({
  title,
  body,
  status,
  onTitleChange,
  onBodyChange,
  onStatusChange,
  onSave,
  loading,
  saving,
  dirty,
  error,
  canWrite,
  taskPath,
}: Et2TaskContentEditorProps) {
  if (!taskPath) {
    return (
      <p className="border-t border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Aufgabe oben auswählen — Titel und Text bearbeitest du hier.
      </p>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-violet-200 bg-violet-50/20 dark:border-violet-900/50 dark:bg-violet-950/15">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-violet-100 px-3 py-2 dark:border-violet-900/40">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Inhalt</span>
        <button
          type="button"
          disabled={!canWrite || !dirty || saving || loading}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Speichern
        </button>
      </div>
      {loading ? (
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Aufgabe wird geladen…
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="shrink-0 border-b border-violet-100 px-3 py-3 dark:border-violet-900/40">
            {taskPath && taskRefFromPath(taskPath) && (
              <label className="mb-3 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Status
                <select
                  value={status}
                  onChange={(e) => onStatusChange(e.target.value as Et2TaskStatus)}
                  disabled={!canWrite}
                  className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                >
                  {ET2_TASK_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Titel
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === DEFAULT_NEW_TASK_TITLE) onTitleChange('')
                }}
                disabled={!canWrite}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-950"
                placeholder={DEFAULT_NEW_TASK_TITLE}
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto [&_.markdown-preview]:max-w-none [&_.markdown-preview]:px-4 [&_.markdown-preview]:py-3">
            <LivePreviewMarkdown content={body} onChange={onBodyChange} canWrite={canWrite} simple />
          </div>
          {dirty && (
            <p className="px-3 pb-2 text-[11px] text-amber-700 dark:text-amber-300">Änderungen noch nicht gespeichert</p>
          )}
          {error && (
            <p className="mx-3 mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950/40">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}