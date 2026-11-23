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
    padding: '1.5rem 0',
    caretColor: '#7c3aed',
    fontFamily: 'inherit',
  },
  '.cm-line': {
    padding: '0 1rem',
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
  '.cm-md-hidden': {
    display: 'none',
  },
  '.cm-md-syntax': {
    color: '#a1a1aa',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.85em',
  },
  '.cm-md-strong': {
    fontWeight: '600',
  },
  '.cm-md-emphasis': {
    fontStyle: 'italic',
  },
  '.cm-md-strikethrough': {
    textDecoration: 'line-through',
    color: '#71717a',
  },
  '.cm-md-inline-code': {
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.9em',
    background: 'rgba(244, 244, 245, 0.9)',
    borderRadius: '4px',
    padding: '0.1em 0.25em',
  },
  '.cm-md-h1': { fontSize: '1.65em', fontWeight: '600', lineHeight: '1.25' },
  '.cm-md-h2': { fontSize: '1.35em', fontWeight: '600', lineHeight: '1.3' },
  '.cm-md-h3': { fontSize: '1.15em', fontWeight: '600', lineHeight: '1.35' },
  '.cm-md-h4': { fontSize: '1.05em', fontWeight: '600', lineHeight: '1.4' },
  '.cm-md-h5': { fontSize: '1em', fontWeight: '600' },
  '.cm-md-h6': { fontSize: '0.95em', fontWeight: '600', color: '#52525b' },
  '.cm-md-link': {
    color: '#059669',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  '.cm-md-blockquote-line': {
    borderLeft: '3px solid #10b981',
    paddingLeft: '0.75em',
    color: '#52525b',
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
    '.cm-md-inline-code': {
      background: 'rgba(39, 39, 42, 0.9)',
    },
    '.cm-md-h6': { color: '#a1a1aa' },
    '.cm-md-blockquote-line': { color: '#a1a1aa' },
  },
  { dark: true },
)