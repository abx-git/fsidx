import { Suspense, lazy } from 'react'
import type { FileSourceStore } from '../../lib/file-sources'
import { MarkdownContent } from './MarkdownContent'
import { MarkdownTextareaWithToolbar } from './MarkdownTextareaWithToolbar'
import { Loader2 } from 'lucide-react'

const FsidxMarkdownEditor = lazy(() =>
  import('./FsidxMarkdownEditor').then((m) => ({ default: m.FsidxMarkdownEditor })),
)

interface LivePreviewMarkdownProps {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
  /** Nur Textarea + statische Vorschau (kleine Aufgabenfelder). */
  simple?: boolean
  editorKey?: string
  docPath?: string
  fileSources?: FileSourceStore | null
}

function SimpleMarkdownBody({
  content,
  onChange,
  canWrite,
  docPath,
  fileSources,
}: {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
  docPath?: string
  fileSources?: FileSourceStore | null
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <MarkdownTextareaWithToolbar
        value={content}
        onChange={onChange}
        disabled={!canWrite}
        placeholder={canWrite ? 'Beschreibung (Markdown)…' : ''}
      />
      {content.trim() ? (
        <div className="markdown-preview max-h-[40vh] overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <MarkdownContent content={content} docPath={docPath} fileSources={fileSources} />
        </div>
      ) : null}
    </div>
  )
}

/** ET2-Beschreibungen: einheitlich FsidxMarkdownEditor (kein MDXEditor mehr). */
export function LivePreviewMarkdown({
  content,
  onChange,
  canWrite,
  simple = false,
  editorKey,
  docPath,
  fileSources = null,
}: LivePreviewMarkdownProps) {
  if (simple) {
    return (
      <SimpleMarkdownBody
        content={content}
        onChange={onChange}
        canWrite={canWrite}
        docPath={docPath}
        fileSources={fileSources}
      />
    )
  }

  return (
    <Suspense
      fallback={
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Editor wird geladen…
        </p>
      }
    >
      <FsidxMarkdownEditor
        content={content}
        onChange={onChange}
        canWrite={canWrite}
        mode="live"
        docPath={docPath}
        fileSources={fileSources}
        editorKey={editorKey}
        compact
      />
    </Suspense>
  )
}