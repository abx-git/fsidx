import { ExternalLink, Link2, Loader2 } from 'lucide-react'
import type { FsidxLinkFile } from '../../types/link-file'

interface LinkDetailPanelProps {
  linkPath: string
  fileName: string
  doc: FsidxLinkFile | null
  loading: boolean
  loadError: string | null
  canWrite: boolean
  saving?: boolean
  saveError?: string | null
  onChange: (patch: Partial<FsidxLinkFile>) => void
  onSave: () => void
  onOpenPreview: () => void
}

export function LinkDetailPanel({
  linkPath,
  fileName,
  doc,
  loading,
  loadError,
  canWrite,
  saving,
  saveError,
  onChange,
  onSave,
  onOpenPreview,
}: LinkDetailPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-900 dark:text-violet-200">
              <Link2 className="h-4 w-4" />
              Web-Link
            </p>
            <p className="truncate font-mono text-[10px] text-zinc-500" title={linkPath}>
              {fileName}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPreview}
            disabled={!doc?.url}
            className="shrink-0 rounded-md bg-violet-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-40"
          >
            Vorschau
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lädt…
          </p>
        )}
        {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
        {doc && !loading && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              onSave()
            }}
          >
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Titel
              <input
                type="text"
                value={doc.title}
                disabled={!canWrite}
                onChange={(e) => onChange({ title: e.target.value })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              URL
              <input
                type="url"
                inputMode="url"
                value={doc.url}
                disabled={!canWrite}
                onChange={(e) => onChange({ url: e.target.value })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
            {doc.url && (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-violet-800 underline dark:text-violet-300"
              >
                <ExternalLink className="h-3 w-3" />
                Ziel im Browser
              </a>
            )}
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Notiz
              <textarea
                rows={3}
                value={doc.note ?? ''}
                disabled={!canWrite}
                onChange={(e) => onChange({ note: e.target.value })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
            {canWrite && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? 'Speichert…' : 'Speichern'}
              </button>
            )}
            {saveError && (
              <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}