import { EditorView } from '@codemirror/view'

/** Browser-Autokorrektur in der Markdown-Zeile vermeiden — kein Maus-Override (CodeMirror platziert die Marke horizontal). */
export const markdownPointerExtension = EditorView.contentAttributes.of({
  spellcheck: 'false',
  autocorrect: 'off',
})