import { useEffect, useState } from 'react'
import { DEFAULT_NEW_TASK_TITLE } from '../../lib/et2/constants'
import { Loader2, X } from 'lucide-react'

interface Et2NewTaskDialogProps {
  open: boolean
  targetDirPath: string
  onClose: () => void
  onSubmit: (dirPath: string, title: string, body: string) => Promise<void>
  scopeLabel: string
}

export function Et2NewTaskDialog({
  open,
  targetDirPath,
  onClose,
  onSubmit,
  scopeLabel,
}: Et2NewTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setBody('')
    setError(null)
    setSaving(false)
  }, [open])

  if (!open) return null

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSubmit(targetDirPath, title.trim() || DEFAULT_NEW_TASK_TITLE, body)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anlegen fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="et2-new-task-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2 id="et2-new-task-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Neue Aufgaben-Datei
            </h2>
            <p className="text-xs text-zinc-500">
              Ordner: {scopeLabel} · Datei heißt{' '}
              <code className="text-[10px]">Aufgaben.tsk.json</code> (oder nummeriert)
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Titel</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DEFAULT_NEW_TASK_TITLE}
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              autoFocus
            />
          </label>
          <label className="flex min-h-[200px] flex-1 flex-col text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Inhalt (Markdown)
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Beschreibung, Checkliste, Notizen …"
              className="min-h-[180px] flex-1 resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm leading-relaxed dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Anlegen
          </button>
        </div>
      </div>
    </div>
  )
}