import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useMemo, useState } from 'react'
import type { FileSourceStore } from '../../lib/file-sources'
import {
  buildFsidxMarkdownExtensions,
  type FsidxMarkdownEditorMode,
} from '../../lib/codemirror/markdownEditorExtensions'

export interface FsidxMarkdownEditorProps {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
  mode: FsidxMarkdownEditorMode
  docPath?: string
  fileSources?: FileSourceStore | null
  /** Remount bei Dateiwechsel */
  editorKey?: string
  /** Kompakter für eingebettete Felder (Aufgaben) */
  compact?: boolean
  placeholder?: string
}

function useDocumentDark() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false,
  )
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(root.classList.contains('dark'))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

/**
 * Einziger Markdown-Editor in fsidx: CodeMirror mit optionaler Live-Vorschau (Obsidian-Stil).
 */
export function FsidxMarkdownEditor({
  content,
  onChange,
  canWrite,
  mode,
  docPath = '',
  fileSources = null,
  editorKey,
  compact = false,
}: FsidxMarkdownEditorProps) {
  const dark = useDocumentDark()
  const ctx = useMemo(() => ({ docPath, fileSources }), [docPath, fileSources])

  const extensions = useMemo(
    () => buildFsidxMarkdownExtensions(mode, canWrite, ctx),
    [mode, canWrite, ctx],
  )

  const shellClass = compact
    ? 'fsidx-md-editor-shell fsidx-md-editor-shell--compact'
    : 'fsidx-md-editor-shell'

  const minHeight = compact ? 'min(28vh, 320px)' : 'min(70vh, 720px)'

  return (
    <div className={shellClass}>
      <CodeMirror
        key={editorKey ?? `${docPath}:${mode}`}
        value={content}
        minHeight={minHeight}
        className="fsidx-md-cm [&_.cm-editor]:!bg-transparent [&_.cm-scroller]:min-h-0"
        editable={canWrite}
        extensions={extensions}
        onChange={onChange}
        theme={dark ? 'dark' : 'light'}
        basicSetup={{
          lineNumbers: mode === 'source',
          foldGutter: false,
          highlightActiveLine: mode === 'source',
          highlightActiveLineGutter: false,
          bracketMatching: mode === 'source',
          autocompletion: false,
          lintKeymap: false,
        }}
      />
    </div>
  )
}