import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Eye, Loader2, Pencil } from 'lucide-react'
import {
  lineNumberAtOffset,
  scrollContainerToSourceLine,
  sourceRangeFromPreviewClick,
} from '../lib/markdown-view-click'
import type { FileSourceStore } from '../lib/file-sources'
import type { MarkdownViewMode } from '../hooks/useMarkdownDocument'
import { isTaskFilePath } from '../lib/et2/paths'
import { MarkdownContent } from './markdown/MarkdownContent'
import { MarkdownTextareaWithToolbar } from './markdown/MarkdownTextareaWithToolbar'

const SCROLL_ANCHOR_PX = 96

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
  const viewScrollRef = useRef<HTMLDivElement>(null)
  const previewArticleRef = useRef<HTMLElement>(null)
  const [editFocus, setEditFocus] = useState<{ start: number; end: number; line: number } | null>(
    null,
  )
  const [viewHighlightLine, setViewHighlightLine] = useState<number | null>(null)

  const handlePreviewDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!canWrite || viewMode !== 'view') return
      e.preventDefault()
      const range = sourceRangeFromPreviewClick(
        content,
        e.currentTarget,
        e.clientX,
        e.clientY,
      )
      const end = range.end > range.start ? range.end : range.start
      setViewHighlightLine(null)
      setEditFocus({
        start: range.start,
        end,
        line: range.line,
      })
      onViewModeChange('edit')
    },
    [canWrite, viewMode, content, onViewModeChange],
  )

  const returnToViewAtCaret = useCallback(
    (caret: number) => {
      const line = lineNumberAtOffset(content, caret)
      setEditFocus(null)
      setViewHighlightLine(line)
      onViewModeChange('view')
    },
    [content, onViewModeChange],
  )

  useEffect(() => {
    if (viewMode !== 'view' || viewHighlightLine == null) return
    const scrollEl = viewScrollRef.current
    const article = previewArticleRef.current
    if (!scrollEl || !article) return
    const id = requestAnimationFrame(() => {
      scrollContainerToSourceLine(scrollEl, article, viewHighlightLine, SCROLL_ANCHOR_PX)
    })
    return () => cancelAnimationFrame(id)
  }, [viewMode, viewHighlightLine, content])

  useEffect(() => {
    if (viewMode === 'edit') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewHighlightLine(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewMode])

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
      <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
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
          <div
            className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-600"
            role="tablist"
            aria-label="Markdown-Ansicht"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'view'}
              onClick={() => {
                setViewHighlightLine(null)
                onViewModeChange('view')
              }}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                viewMode === 'view'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Ansicht
            </button>
            {canWrite && (
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'edit'}
                onClick={() => onViewModeChange('edit')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                  viewMode === 'edit'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                Bearbeiten
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={downloadEdited}
            disabled={!content}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-zinc-600"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {saveError && (
          <p className="mx-4 mt-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {saveError}
          </p>
        )}
        {loading && (
          <p className="flex flex-1 items-center justify-center gap-2 px-4 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Markdown wird geladen…
          </p>
        )}
        {!loading && error && (
          <p className="mx-4 my-8 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        {!loading && !error && viewMode === 'view' && (
          <div
            ref={viewScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <article
              ref={previewArticleRef}
              className={`markdown-preview mx-auto max-w-3xl px-4 py-6 text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100 ${
                canWrite ? 'cursor-text' : ''
              }`}
              title={canWrite ? 'Doppelklick zum Bearbeiten (Esc zurück)' : undefined}
              onDoubleClick={handlePreviewDoubleClick}
            >
              {content.trim() ? (
                <MarkdownContent
                  content={content}
                  docPath={filePath}
                  fileSources={fileSources}
                  highlightSourceLine={viewHighlightLine}
                />
              ) : canWrite ? (
                <p
                  className={`text-sm text-zinc-400 ${
                    viewHighlightLine === 1 ? 'md-preview-line-focus rounded-sm bg-violet-500/10' : ''
                  }`}
                  data-md-source-start="1"
                  data-md-source-end="1"
                >
                  Doppelklick zum Schreiben…
                </p>
              ) : (
                <p className="text-sm text-zinc-400">Kein Inhalt.</p>
              )}
            </article>
          </div>
        )}
        {!loading && !error && viewMode === 'edit' && canWrite && (
          <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 py-2">
            <MarkdownTextareaWithToolbar
              value={content}
              onChange={onChange}
              disabled={!canWrite}
              placeholder="Markdown…"
              stickyToolbar
              focusRange={editFocus}
              onFocusRangeApplied={() => setEditFocus(null)}
              onEscapeAt={returnToViewAtCaret}
            />
          </div>
        )}
      </div>
    </section>
  )
}