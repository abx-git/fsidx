import { EditorView } from '@codemirror/view'
import { dispatchSelection } from './fsidxMarkdownClick'

const PREVIEW_CLICK =
  '.cm-md-rendered-chunk, .cm-md-fenced-preview, .cm-md-image-wrap'

/** Einklappende Auswahl an der Klickposition — verhindert Phantom-Markierungen über verborgenen Blöcken. */
export const markdownPointerExtension = [
  EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button !== 0 || !view.state.facet(EditorView.editable)) return false
      if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false
      if (event.detail > 1) return false
      if ((event.target as HTMLElement).closest(PREVIEW_CLICK)) return false

      const hit = view.posAndSideAtCoords(
        { x: event.clientX, y: event.clientY },
        false,
      )
      const sel = view.state.selection.main
      if (sel.empty && sel.head === hit.pos) return false

      dispatchSelection(view, hit.pos)
      return true
    },
  }),
  EditorView.contentAttributes.of({
    spellcheck: 'false',
    autocorrect: 'off',
  }),
]