import CodeMirror from '@uiw/react-codemirror'
import { insertNewlineContinueMarkup, markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView, keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { useEffect, useMemo, useState } from 'react'
import type { FileSourceStore } from '../../lib/file-sources'
import { fsidxDarkMarkdownEditorTheme, fsidxMarkdownEditorTheme } from '../../lib/codemirror/fsidxEditorTheme'
import { markdownLivePreviewPlugin } from '../../lib/codemirror/fsidxMarkdownLivePreview'
import { markdownPointerExtension } from '../../lib/codemirror/fsidxMarkdownPointer'

interface ObsidianLiveMarkdownEditorProps {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
  docPath: string
  fileSources: FileSourceStore | null
  editorKey?: string
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

export function ObsidianLiveMarkdownEditor({
  content,
  onChange,
  canWrite,
  docPath,
  fileSources,
  editorKey,
}: ObsidianLiveMarkdownEditorProps) {
  const dark = useDocumentDark()

  const extensions = useMemo(() => {
    const ctx = { docPath, fileSources }
    return [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ class: 'markdown-preview obsidian-live-editor' }),
      fsidxMarkdownEditorTheme,
      fsidxDarkMarkdownEditorTheme,
      markdownLivePreviewPlugin(ctx),
      markdownPointerExtension,
      Prec.high(
        keymap.of([
          { key: 'Enter', run: insertNewlineContinueMarkup },
          { key: 'Mod-Enter', run: insertNewlineContinueMarkup },
        ]),
      ),
      EditorView.editable.of(canWrite),
    ]
  }, [canWrite, docPath, fileSources])

  return (
    <div className="obsidian-live-shell mx-auto w-full max-w-3xl min-h-full pb-8">
      <CodeMirror
        key={editorKey ?? docPath}
        value={content}
        minHeight="min(70vh, 720px)"
        className="[&_.cm-editor]:!bg-transparent [&_.cm-scroller]:min-h-0"
        editable={canWrite}
        extensions={extensions}
        onChange={(value) => onChange(value)}
        theme={dark ? 'dark' : 'light'}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          bracketMatching: false,
          autocompletion: false,
          lintKeymap: false,
        }}
      />
    </div>
  )
}