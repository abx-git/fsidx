import { Suspense, lazy } from 'react'
import type { FileSourceStore } from '../../lib/file-sources'
import { MarkdownContent } from './MarkdownContent'
import { MarkdownTextareaWithToolbar } from './MarkdownTextareaWithToolbar'
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
  /** Für Bilder: Workspace-Datei neben dem Dokument (z. B. Pfad der `.md` oder `.tsk.json`). */
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
          <MarkdownContent
            content={content}
            docPath={docPath}
            fileSources={fileSources}
          />
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