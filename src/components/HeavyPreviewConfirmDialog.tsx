import { AlertTriangle, X } from 'lucide-react'
import type { FileViewerKind } from '../lib/file-viewers'
import { VIEWER_MENU_LABELS } from '../lib/file-viewers'
import { formatBytes } from '../lib/format'
import { HEAVY_PREVIEW_WARN_BYTES } from '../lib/heavy-preview'

export interface HeavyPreviewConfirmRequest {
  viewer: FileViewerKind
  path: string
  name: string
  id: string
  size: number
}

interface HeavyPreviewConfirmDialogProps {
  request: HeavyPreviewConfirmRequest | null
  onConfirm: () => void
  onCancel: () => void
}

export function HeavyPreviewConfirmDialog({
  request,
  onConfirm,
  onCancel,
}: HeavyPreviewConfirmDialogProps) {
  if (!request) return null

  const viewerLabel = VIEWER_MENU_LABELS[request.viewer] ?? request.viewer

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="heavy-preview-title"
        aria-describedby="heavy-preview-desc"
        className="w-full max-w-md rounded-xl border border-amber-200 bg-white shadow-xl dark:border-amber-900/50 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-2 border-b border-amber-100 px-4 py-3 dark:border-amber-950/50">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div>
              <h2 id="heavy-preview-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Große Datei — Vorschau laden?
              </h2>
              <p className="mt-0.5 truncate text-xs text-zinc-500" title={request.path}>
                {request.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Dialog schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div id="heavy-preview-desc" className="space-y-2 px-4 py-4 text-sm text-zinc-700 dark:text-zinc-200">
          <p>
            Die Datei ist etwa <strong>{formatBytes(request.size)}</strong> groß (Schwelle{' '}
            {formatBytes(HEAVY_PREVIEW_WARN_BYTES)}). Die Vorschau lädt die Datei vollständig in den
            Browser — bei Tabellen (Excel/ODS) kann das Speicher und UI belasten oder nach etwa 30
            Sekunden abbrechen.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Vorschau-Typ: {viewerLabel}. Für sehr große Tabellen eignet sich LibreOffice oder Excel
            besser.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
          >
            Trotzdem laden
          </button>
        </div>
      </div>
    </div>
  )
}