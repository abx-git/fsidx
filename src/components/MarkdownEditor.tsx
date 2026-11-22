import {
  ArrowLeft,
  BookOpen,
  Code2,
  Download,
  Loader2,
} from 'lucide-react'
import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MarkdownViewMode } from '../hooks/useMarkdownDocument'

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
    <section className="flex h-full min-h-0 flex-col bg-white dark:bg-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2">
          {showBackButton && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{fileName}</p>
            <p className="truncate font-mono text-[11px] text-zinc-500">{filePath}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Edited in session
            </span>
          )}
          <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => onViewModeChange('preview')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                viewMode === 'preview'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
              title="Reading view (default)"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Reading
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('source')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                viewMode === 'source'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
              title="Source mode"
            >
              <Code2 className="h-3.5 w-3.5" />
              Source
            </button>
          </div>
          <button
            type="button"
            onClick={downloadEdited}
            disabled={!content}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <span className="hidden text-[10px] text-zinc-400 sm:inline">
            Ctrl+E toggle
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && (
          <p className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading markdown…
          </p>
        )}
        {!loading && error && (
          <p className="mx-4 my-8 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        {!loading && !error && viewMode === 'preview' && (
          <article className="markdown-preview mx-auto max-w-3xl px-6 py-8 text-left text-zinc-800 dark:text-zinc-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '_Empty file_'}</ReactMarkdown>
          </article>
        )}
        {!loading && !error && viewMode === 'source' && (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="h-full min-h-[60vh] w-full resize-none border-0 bg-zinc-50 p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-100"
            aria-label="Markdown source"
          />
        )}
      </div>
    </section>
  )
}