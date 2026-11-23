import {
  ArrowLeft,
  Download,
  Eye,
  Code2,
  Loader2,
  Save,
} from 'lucide-react'
import { useEffect } from 'react'
import type { MarkdownViewMode } from '../hooks/useMarkdownDocument'
import { LivePreviewMarkdown } from './markdown/LivePreviewMarkdown'
import { isTaskFilePath } from '../lib/et2/paths'
import { CollapsibleSection } from './ui/CollapsibleSection'

interface MarkdownEditorProps {
  fileName: string
  filePath: string
  content: string
  onChange: (value: string) => void
  viewMode: MarkdownViewMode
  onViewModeChange: (mode: MarkdownViewMode) => void
  onToggleViewMode: () => void
  loading: boolean
  error: string | null
  dirty: boolean
  onClose: () => void
  showBackButton?: boolean
  canWrite?: boolean
  onSave?: () => void | Promise<void>
  saving?: boolean
  saveError?: string | null
}

export function MarkdownEditor({
  fileName,
  filePath,
  content,
  onChange,
  viewMode,
  onViewModeChange,
  onToggleViewMode,
  loading,
  error,
  dirty,
  onClose,
  showBackButton = true,
  canWrite = false,
  onSave,
  saving = false,
  saveError,
}: MarkdownEditorProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        onToggleViewMode()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onToggleViewMode])

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
          {dirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Ungespeichert
            </span>
          )}
          {viewMode === 'live' ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Eye className="h-3.5 w-3.5" />
              Bearbeiten
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <Code2 className="h-3.5 w-3.5" />
              Quelltext
            </span>
          )}
          {canWrite && onSave && (
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          )}
          <CollapsibleSection summary="Mehr" className="py-0.5">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onViewModeChange(viewMode === 'live' ? 'source' : 'live')}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] dark:border-zinc-600"
              >
                {viewMode === 'live' ? 'Quelltext' : 'WYSIWYG'}
              </button>
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
            <p className="mt-1 text-[10px] text-zinc-400">Tastenkürzel: Strg+E zwischen WYSIWYG und Quelle</p>
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
        {!loading && !error && viewMode === 'live' && (
          <LivePreviewMarkdown
            content={content}
            onChange={onChange}
            canWrite={canWrite}
            editorKey={filePath}
          />
        )}
        {!loading && !error && viewMode === 'source' && (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="h-full min-h-[60vh] w-full resize-none border-0 bg-zinc-50 p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-100"
            aria-label="Markdown-Quelltext"
          />
        )}
      </div>
    </section>
  )
}