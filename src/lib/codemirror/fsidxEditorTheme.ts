import { EditorView } from '@codemirror/view'

export const fsidxMarkdownEditorTheme = EditorView.theme({
  '&': {
    fontSize: '0.95rem',
    lineHeight: '1.65',
    backgroundColor: 'transparent',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    padding: '0.75rem 0',
    caretColor: '#7c3aed',
    fontFamily: 'inherit',
  },
  '.cm-line': {
    padding: '0 1rem',
    minHeight: '0',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-cursor': {
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(124, 58, 237, 0.18) !important',
  },
  '.cm-md-edit-line': {
    backgroundColor: 'rgba(124, 58, 237, 0.07)',
  },
  '.cm-md-rendered-line': {
    display: 'inline',
    width: 'auto',
    verticalAlign: 'baseline',
  },
  '.cm-md-rendered-block': {
    display: 'block',
    width: '100%',
  },
  '.cm-md-rendered-gap': {
    minHeight: '0',
  },
  '.cm-md-mermaid, .cm-md-image-wrap': {
    display: 'block',
    margin: '0.75rem 0',
    maxWidth: '100%',
  },
  '.cm-md-mermaid img, .cm-md-image-wrap img': {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    margin: '0 auto',
  },
})

export const fsidxDarkMarkdownEditorTheme = EditorView.theme(
  {
    '.cm-md-edit-line': {
      backgroundColor: 'rgba(124, 58, 237, 0.14)',
    },
  },
  { dark: true },
)