import { EditorView } from '@codemirror/view'
import { activeEditRegion } from './fsidxMarkdownRegions'
import { dispatchSelection } from './fsidxMarkdownClick'

/** Setzt die Auswahl zuverlässig auf die Klickposition in der aktiven Quellzeile. */
export const markdownPointerExtension = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 0 || !view.state.facet(EditorView.editable)) return false
    if ((event.target as HTMLElement).closest('.cm-md-rendered-chunk, .cm-md-fenced-preview')) {
      return false
    }
    const hit = view.posAtCoords({ x: event.clientX, y: event.clientY }, false)
    const active = activeEditRegion(view.state)
    if (hit < active.from || hit > active.to) return false
    dispatchSelection(view, hit)
    return true
  },
})