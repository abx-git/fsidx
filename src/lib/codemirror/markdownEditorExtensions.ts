import { insertNewlineContinueMarkup, markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { Prec, type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { fsidxDarkMarkdownEditorTheme, fsidxMarkdownEditorTheme } from './fsidxEditorTheme'
import { markdownLineNavigation } from './fsidxMarkdownLineNavigation'
import { markdownLivePreviewPlugin } from './fsidxMarkdownLivePreview'
import type { MarkdownWidgetContext } from './fsidxMarkdownWidgets'

export type FsidxMarkdownEditorMode = 'live' | 'source'

export function buildFsidxMarkdownExtensions(
  mode: FsidxMarkdownEditorMode,
  canWrite: boolean,
  ctx: MarkdownWidgetContext,
): Extension[] {
  const base: Extension[] = [
    markdown({ base: markdownLanguage }),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({
      class: mode === 'live' ? 'markdown-preview fsidx-md-editor' : 'fsidx-md-editor fsidx-md-source',
      spellcheck: 'false',
      autocorrect: 'off',
    }),
    fsidxMarkdownEditorTheme,
    fsidxDarkMarkdownEditorTheme,
    Prec.high(
      keymap.of([
        { key: 'Enter', run: insertNewlineContinueMarkup },
        { key: 'Mod-Enter', run: insertNewlineContinueMarkup },
      ]),
    ),
    EditorView.editable.of(canWrite),
  ]

  if (mode === 'live') {
    base.push(markdownLivePreviewPlugin(ctx), markdownLineNavigation)
  }

  return base
}