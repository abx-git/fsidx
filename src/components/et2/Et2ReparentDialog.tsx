import { useMemo, useState } from 'react'
import type { Et2TaskSummary } from '../../types/et2-task'
import { collectDescendantTaskIds } from '../../lib/et2/task-bundle-ops'
import type { Et2TaskRecord } from '../../types/et2-tasks-bundle'

interface Et2ReparentDialogProps {
  open: boolean
  taskId: string
  tasks: Et2TaskSummary[]
  onCancel: () => void
  onConfirm: (newParentId: string | null) => void
}

export function Et2ReparentDialog({
  open,
  taskId,
  tasks,
  onCancel,
  onConfirm,
}: Et2ReparentDialogProps) {
  const [choice, setChoice] = useState<string>('__root__')

  const options = useMemo(() => {
    const records: Et2TaskRecord[] = tasks.map((t) => ({
      id: t.taskId,
      parentId: t.parentId,
      title: t.title,
      status: t.status ?? 'open',
    }))
    const blocked = collectDescendantTaskIds(records, taskId)
    blocked.add(taskId)
    return tasks.filter((t) => !blocked.has(t.taskId))
  }, [tasks, taskId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="reparent-title"
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2 id="reparent-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Als Unteraufgabe von …
        </h2>
        <p className="mt-1 text-xs text-zinc-500">Neue übergeordnete Aufgabe wählen.</p>
        <select
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="__root__">— Wurzel (kein Parent) —</option>
          {options.map((t) => (
            <option key={t.taskId} value={t.taskId}>
              {'\u00a0'.repeat((t.depth ?? 0) * 2)}
              {t.title}
            </option>
          ))}
        </select>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
            onClick={onCancel}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-800 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            onClick={() => onConfirm(choice === '__root__' ? null : choice)}
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}