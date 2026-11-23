import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { Suspense, lazy } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import type { MarkdownViewMode } from '../hooks/useMarkdownDocument'
import { isTaskFilePath } from '../lib/et2/paths'
import { CollapsibleSection } from './ui/CollapsibleSection'
const ObsidianLiveMarkdownEditor = lazy(() =>
  import('./markdown/ObsidianLiveMarkdownEditor').then((m) => ({
    default: m.ObsidianLiveMarkdownEditor,
  })),
)

interface MarkdownEditorProps {
  fileName: string
  filePath: string
  content: string
  onChange: (value: string) => void
  viewMode: MarkdownViewMode
  onViewModeChange: (mode: MarkdownViewMode) => void
  loading: boolean
  error: string | null
  onClose: () => void
  showBackButton?: boolean
  canWrite?: boolean
  saving?: boolean
  saveError?: string | null
  fileSources: FileSourceStore | null
}

export function MarkdownEditor({
  fileName,
  filePath,
  content,
  onChange,
  viewMode,
  onViewModeChange,
  loading,
  error,
  onClose,
  showBackButton = true,
  canWrite = false,
  saving = false,
  saveError,
  fileSources,
}: MarkdownEditorProps) {
  const downloadEdited = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2">
          {showBackButton && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </button>
          )}
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{fileName}</p>
            {isTaskFilePath(filePath) ? (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Legacy-Aufgabe — nur Beschreibungstext (ohne YAML)
              </p>
            ) : (
              <p className="truncate text-[11px] text-zinc-500" title={filePath}>
                {filePath}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && saving && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Speichern…
            </span>
          )}
          <CollapsibleSection summary="Mehr" className="py-0.5">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onViewModeChange('reading')}
                className={`inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] dark:border-zinc-600 ${
                  viewMode === 'reading' ? 'bg-sky-100 dark:bg-sky-950/50' : ''
                }`}
              >
                Live-Vorschau
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => onViewModeChange('source')}
                  className={`inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] dark:border-zinc-600 ${
                    viewMode === 'source' ? 'bg-zinc-200 dark:bg-zinc-700' : ''
                  }`}
                >
                  Quelltext
                </button>
              )}
              <button
                type="button"
                onClick={downloadEdited}
                disabled={!content}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] disabled:opacity-50 dark:border-zinc-600"
              >
                <Download className="h-3 w-3" />
                Download
              </button>
            </div>
            {canWrite && (
              <p className="mt-1 text-[10px] text-zinc-400">
                Wie Obsidian Live Preview: nur die aktuelle Zeile (ganze Tabelle im Tabellenmodus)
                als Markdown · Rest gerendert · Quelltext unter „Quelltext“
              </p>
            )}
          </CollapsibleSection>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {saveError && (
          <p className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {saveError}
          </p>
        )}
        {loading && (
          <p className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Markdown wird geladen…
          </p>
        )}
        {!loading && error && (
          <p className="mx-4 my-8 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        {!loading && !error && viewMode === 'reading' && (
          <Suspense
            fallback={
              <p className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Live-Editor wird geladen…
              </p>
            }
          >
            <ObsidianLiveMarkdownEditor
              content={content}
              onChange={onChange}
              canWrite={canWrite}
              docPath={filePath}
              fileSources={fileSources}
              editorKey={filePath}
            />
          </Suspense>
        )}
        {!loading && !error && viewMode === 'source' && (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            readOnly={!canWrite}
            className="h-full min-h-[60vh] w-full resize-none border-0 bg-zinc-50 p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-100"
            aria-label="Markdown-Quelltext"
          />
        )}
      </div>
    </section>
  )
}