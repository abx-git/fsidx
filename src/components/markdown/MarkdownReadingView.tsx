import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Pencil } from 'lucide-react'

interface MarkdownReadingViewProps {
  content: string
  canWrite: boolean
  onStartEdit?: () => void
}

export function MarkdownReadingView({ content, canWrite, onStartEdit }: MarkdownReadingViewProps) {
  const empty = !content.trim()

  return (
    <article
      className={`markdown-preview relative mx-auto max-w-3xl px-6 py-8 text-left text-zinc-800 dark:text-zinc-100 ${
        canWrite && onStartEdit ? 'cursor-text' : ''
      }`}
      onClick={(e) => {
        if (!canWrite || !onStartEdit) return
        const t = e.target as HTMLElement
        if (t.closest('a, button')) return
        onStartEdit()
      }}
      onKeyDown={(e) => {
        if (!canWrite || !onStartEdit) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onStartEdit()
        }
      }}
      role={canWrite && onStartEdit ? 'button' : undefined}
      tabIndex={canWrite && onStartEdit ? 0 : undefined}
    >
      {canWrite && onStartEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit()
          }}
          className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white/90 px-2 py-1 text-[11px] font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Pencil className="h-3 w-3" />
          Bearbeiten
        </button>
      )}
      {empty ? (
        <p className="text-sm text-zinc-400 italic">
          {canWrite ? 'Noch kein Inhalt — klicken zum Schreiben.' : '—'}
        </p>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      )}
    </article>
  )
}