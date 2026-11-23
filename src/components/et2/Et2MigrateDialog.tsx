import { useCallback, useState } from 'react'
import { X, FileUp, AlertTriangle } from 'lucide-react'
import { isEt2BoardSnapshot, type Et2BoardSnapshotV1 } from '../../types/et2-legacy'
import {
  migrateEt2BoardApply,
  migrateEt2BoardDryRun,
  type MigrateDryRunResult,
} from '../../lib/et2/migrate-monolith'

interface Et2MigrateDialogProps {
  open: boolean
  onClose: () => void
  canWrite: boolean
  onApplyFile: (relativePath: string, content: string, size: number) => Promise<void>
  onApplied: () => void
}

export function Et2MigrateDialog({
  open,
  onClose,
  canWrite,
  onApplyFile,
  onApplied,
}: Et2MigrateDialogProps) {
  const [dryRun, setDryRun] = useState<MigrateDryRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setDryRun(null)
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result)) as unknown
        if (!isEt2BoardSnapshot(json)) {
          throw new Error('Kein ET2-Board (format: hierarchical-task-manager, scope: board).')
        }
        setDryRun(migrateEt2BoardDryRun(json as Et2BoardSnapshotV1))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import fehlgeschlagen')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleApply = useCallback(async () => {
    if (!dryRun || !canWrite) return
    setApplying(true)
    setError(null)
    try {
      await migrateEt2BoardApply(dryRun, {
        writeFile: async (relativePath, content) => {
          const size = new Blob([content]).size
          await onApplyFile(relativePath, content, size)
        },
      })
      onApplied()
      onClose()
      setDryRun(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Schreiben fehlgeschlagen')
    } finally {
      setApplying(false)
    }
  }, [dryRun, canWrite, onApplyFile, onApplied, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="et2-migrate-title"
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 id="et2-migrate-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            ET2-Board importieren
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            Wähle eine <code className="text-xs">et2-board.json</code> (scope: board). Der Wizard schreibt eine{' '}
            <code className="text-xs">.et2/tasks.json</code> mit allen Aufgaben, Unteraufgaben (
            <code className="text-xs">parentId</code>) und Status — ohne zusätzliche Projekt-Unterordner.
          </p>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-4 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800/50">
            <FileUp className="h-5 w-5 text-violet-500" />
            <span>JSON-Datei wählen…</span>
            <input type="file" accept="application/json,.json" className="hidden" onChange={onPickFile} />
          </label>

          {!canWrite && (
            <p className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Schreiben nur mit Chrome/Edge-Ordnerpicker (read/write). Legacy-Auswahl ist lesend.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}

          {dryRun && (
            <div className="rounded-lg bg-zinc-50 px-3 py-3 text-xs dark:bg-zinc-800/60">
              <p className="font-medium text-zinc-800 dark:text-zinc-100">Dry-run Vorschau</p>
              <ul className="mt-2 list-inside list-disc text-zinc-600 dark:text-zinc-400">
                <li>{dryRun.taskCount} Aufgaben</li>
                <li>{dryRun.folderCount} Ordner (inkl. Zwischenebenen)</li>
                <li>{dryRun.files.length} Dateien gesamt</li>
                <li>{dryRun.relationFiles} relations.json</li>
              </ul>
            </div>
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
            disabled={!dryRun || !canWrite || applying}
            onClick={() => void handleApply()}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {applying ? 'Schreibe…' : 'Auf Platte schreiben'}
          </button>
        </div>
      </div>
    </div>
  )
}