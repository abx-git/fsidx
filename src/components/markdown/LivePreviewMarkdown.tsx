import { MarkdownTextareaWithToolbar } from './MarkdownTextareaWithToolbar'

interface LivePreviewMarkdownProps {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
  /** Unbenutzt (Kompatibilität). */
  simple?: boolean
  editorKey?: string
  docPath?: string
  fileSources?: import('../../lib/file-sources').FileSourceStore | null
  minHeightClass?: string
}

/** ET2-Beschreibungen: Textarea mit Markdown-Menüzeile. */
export function LivePreviewMarkdown({
  content,
  onChange,
  canWrite,
  minHeightClass = 'min-h-[7.5rem]',
}: LivePreviewMarkdownProps) {
  return (
    <MarkdownTextareaWithToolbar
      value={content}
      onChange={onChange}
      disabled={!canWrite}
      placeholder={canWrite ? 'Beschreibung (Markdown)…' : ''}
      minHeightClass={minHeightClass}
    />
  )
}