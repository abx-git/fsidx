import {
  MDXEditor,
  type MDXEditorMethods,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertTable,
  ListsToggle,
  Separator,
  UndoRedo,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import { useEffect, useRef } from 'react'

interface WysiwygMarkdownEditorProps {
  content: string
  onChange: (value: string) => void
  canWrite: boolean
  /** Remount editor when switching files. */
  editorKey?: string
  placeholder?: string
}

export function WysiwygMarkdownEditor({
  content,
  onChange,
  canWrite,
  editorKey = 'default',
  placeholder = 'Markdown-Inhalt…',
}: WysiwygMarkdownEditorProps) {
  const ref = useRef<MDXEditorMethods>(null)

  useEffect(() => {
    const current = ref.current?.getMarkdown()
    if (current === content) return
    ref.current?.setMarkdown(content)
  }, [content])

  return (
    <article className="mdx-editor-fsidx mx-auto w-full max-w-4xl px-2 py-3">
      <MDXEditor
        key={editorKey}
        ref={ref}
        markdown={content}
        readOnly={!canWrite}
        placeholder={canWrite ? placeholder : undefined}
        contentEditableClassName="mdx-editor-fsidx-content"
        className="mdx-editor-fsidx-root"
        onChange={onChange}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarClassName: 'mdx-editor-fsidx-toolbar',
            toolbarContents: () =>
              canWrite ? (
                <>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <Separator />
                  <BlockTypeSelect />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertTable />
                </>
              ) : null,
          }),
        ]}
      />
    </article>
  )
}