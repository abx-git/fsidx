import { Suspense, lazy, useCallback, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2 } from 'lucide-react'

const WysiwygMarkdownEditor = lazy(() =>
  import('./WysiwygMarkdownEditor').then((m) => ({ default: m.WysiwygMarkdownEditor })),
)

interface LivePreviewMarkdownProps {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
  /** Weniger Hilfetexte (z. B. eingebettet in Aufgaben). */
  compactHints?: boolean
  /** Ein durchgehendes Textfeld + Vorschau (Aufgabenbeschreibung). */
  simple?: boolean
  /** Editor neu laden beim Dateiwechsel (Markdown-Dateien). */
  editorKey?: string
}

function SimpleMarkdownBody({
  content,
  onChange,
  canWrite,
}: {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [content, resize])

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <textarea
        ref={ref}
        value={content}
        disabled={!canWrite}
        onChange={(e) => {
          onChange(e.target.value)
          resize()
        }}
        placeholder={canWrite ? 'Beschreibung (Markdown)…' : ''}
        spellCheck={true}
        className="min-h-[7.5rem] w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      />
      {content.trim() ? (
        <div className="markdown-preview max-h-[40vh] overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  )
}

export function LivePreviewMarkdown({
  content,
  onChange,
  canWrite,
  simple = false,
  editorKey,
}: LivePreviewMarkdownProps) {
  if (simple) {
    return <SimpleMarkdownBody content={content} onChange={onChange} canWrite={canWrite} />
  }

  return (
    <Suspense
      fallback={
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Editor wird geladen…
        </p>
      }
    >
      <WysiwygMarkdownEditor
        content={content}
        onChange={onChange}
        canWrite={canWrite}
        editorKey={editorKey}
      />
    </Suspense>
  )
}